import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as xlsx from 'xlsx';
import { parseStringPromise } from 'xml2js';
import { getWorkspaceSession, validateObraOwnership, unauthorizedResponse } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const workspaceId = await getWorkspaceSession();
    if (!workspaceId) return unauthorizedResponse();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const obraId = formData.get('obraId') as string;

    if (!file || !obraId) {
      return NextResponse.json({ error: 'Arquivo e obraId são obrigatórios' }, { status: 400 });
    }

    // TENANT GUARD: Validar se a obra de destino pertence ao workspace do usuário logado
    const isOwner = await validateObraOwnership(obraId, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    const mappingStr = formData.get('mapping') as string;
    let mapping: { local: string, servico: string, inicio: string, fim: string, custo: string } | null = null;
    if (mappingStr) {
      try { mapping = JSON.parse(mappingStr); } catch {}
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = file.name.toLowerCase();

    let activitiesToCreate: Array<{ local: string, servico: string, inicio: Date, fim: Date, custo: number, peso: number }> = [];

    const parseExcelDate = (value: unknown): Date => {
      if (!value) return new Date();
      if (typeof value === 'number') {
        return new Date((value - 25569) * 86400 * 1000);
      }
      if (typeof value === 'string') {
        const parts = value.split('/');
        if (parts.length === 3) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }
      const d = new Date(value as string | number | Date);
      return isNaN(d.getTime()) ? new Date() : d;
    };

    if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet);

      activitiesToCreate = rows.map((row) => {
        let valLocal, valServico, valInicio, valFim, valCusto;

        if (mapping) {
          valLocal = row[mapping.local];
          valServico = row[mapping.servico];
          valInicio = row[mapping.inicio];
          valFim = row[mapping.fim];
          valCusto = row[mapping.custo];
        } else {
          const getVal = (possibleNames: string[]) => {
            for (const key of Object.keys(row)) {
              if (possibleNames.includes(key.toLowerCase().trim())) return row[key];
            }
            return undefined;
          };
          valLocal = getVal(['local', 'pavimento', 'fase', 'etapa', 'zona', 'bloco', 'ambiente', 'setor', 'área', 'area']);
          valServico = getVal(['serviço', 'servico', 'atividade', 'tarefa', 'nome', 'descrição', 'descricao', 'item', 'etapa de serviço']);
          valInicio = getVal(['data início', 'data inicio', 'inicio', 'início', 'start', 'data de início', 'data de inicio', 'início planejado']);
          valFim = getVal(['data término', 'data termino', 'término', 'termino', 'fim', 'finish', 'data de término', 'data fim', 'término planejado']);
          valCusto = getVal(['custo', 'custo (r$)', 'valor', 'orçamento', 'total', 'preço', 'orçamento total', 'preço total']);
        }

        return {
          local: valLocal ? String(valLocal) : 'Geral',
          servico: valServico ? String(valServico) : 'Limpeza',
          inicio: parseExcelDate(valInicio),
          fim: parseExcelDate(valFim),
          custo: Number(valCusto) || 0,
          peso: 1,
        };
      });
    }
    else if (filename.endsWith('.xml')) {
      const xmlString = buffer.toString('utf-8');
      const result = await parseStringPromise(xmlString);
      
      const project = result.Project;
      if (!project || !project.Tasks || !project.Tasks[0].Task) {
         return NextResponse.json({ error: 'Formato de XML do MS Project inválido.' }, { status: 400 });
      }

      const tasks = project.Tasks[0].Task;

      tasks.forEach((task: Record<string, unknown[]>) => {
        const isSummary = task.Summary && task.Summary[0] === '1';
        if (isSummary) return;
        
        let localName = 'Geral';
        const parentWBS = task.WBS ? (task.WBS[0] as string).split('.').slice(0, -1).join('.') : null;
        
        if (parentWBS) {
          const parentTask = tasks.find((t: Record<string, unknown[]>) => t.WBS && t.WBS[0] === parentWBS);
          if (parentTask && parentTask.Name) {
            localName = parentTask.Name[0] as string;
          }
        }

        activitiesToCreate.push({
          local: localName,
          servico: task.Name ? (task.Name[0] as string) : 'Tarefa Sem Nome',
          inicio: task.Start ? new Date(task.Start[0] as string) : new Date(),
          fim: task.Finish ? new Date(task.Finish[0] as string) : new Date(),
          custo: task.Cost ? Number(task.Cost[0]) : 0,
          peso: task.Work ? Number((task.Work[0] as string).replace('PT','').replace('H','')) : 0,
        });
      });
    } 
    else if (filename.endsWith('.mpp')) {
      return NextResponse.json({ error: 'Formato fechado da Microsoft não suportado. Por favor, abra o MS Project, vá em "Salvar Como -> Dados XML (*.xml)" e envie o arquivo gerado para garantirmos a precisão.' }, { status: 400 });
    } 
    else {
      return NextResponse.json({ error: 'Formato não suportado. Envie Excel (.xlsx, .csv) ou MS Project (.xml)' }, { status: 400 });
    }

    if (activitiesToCreate.length === 0) {
      return NextResponse.json({ error: 'Nenhuma atividade válida encontrada no arquivo.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const versao = await tx.cronogramaVersao.create({
        data: {
          nome: file.name,
          obraId
        }
      });

      const existingLocations = await tx.location.findMany({ where: { obraId } });
      const existingServices = await tx.service.findMany({ where: { obraId } });
      
      const locMap = new Map(existingLocations.map(l => [l.name.toLowerCase(), l.id]));
      const servMap = new Map(existingServices.map(s => [s.name.toLowerCase(), s.id]));



      for (const act of activitiesToCreate) {
        const locNameLower = act.local.toLowerCase();
        let locationId = locMap.get(locNameLower);
        if (!locationId) {
          const newLoc = await tx.location.create({
            data: { name: act.local, obraId }
          });
          locationId = newLoc.id;
          locMap.set(locNameLower, locationId);
        }

        const servNameLower = act.servico.toLowerCase();
        let serviceId = servMap.get(servNameLower);
        if (!serviceId) {
          const newServ = await tx.service.create({
            data: { name: act.servico, color: '#3b82f6', obraId }
          });
          serviceId = newServ.id;
          servMap.set(servNameLower, serviceId);
        }

        await tx.atividade.create({
          data: {
            name: `${act.servico} - ${act.local}`,
            startDate: act.inicio,
            endDate: act.fim,
            budgetedCost: act.custo,
            locationId,
            serviceId,
            obraId
          }
        });
      }
      
      return { count: activitiesToCreate.length };
    }, {
      maxWait: 10000,
      timeout: 120000
    });

    return NextResponse.json({ message: 'Importação concluída com sucesso', atividadesImportadas: result.count }, { status: 201 });

  } catch (error) {
    console.error('Erro na importação:', error);
    const msg = error instanceof Error ? error.message : 'Erro interno processando importação';
    return NextResponse.json({ error: `Falha na importação: ${msg}` }, { status: 500 });
  }
}
