import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as xlsx from 'xlsx';
import { parseStringPromise } from 'xml2js';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const obraId = formData.get('obraId') as string;

    if (!file || !obraId) {
      return NextResponse.json({ error: 'Arquivo e obraId são obrigatórios' }, { status: 400 });
    }

    const mappingStr = formData.get('mapping') as string;
    let mapping = null;
    if (mappingStr) {
      try { mapping = JSON.parse(mappingStr); } catch (e) {}
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = file.name.toLowerCase();

    let activitiesToCreate: Array<{ local: string, servico: string, inicio: Date, fim: Date, custo: number, peso: number }> = [];

    // Função auxiliar para interpretar datas de Excel e pt-BR
    const parseExcelDate = (value: any): Date => {
      if (!value) return new Date();
      if (typeof value === 'number') {
        // Serial de data do Excel para JS
        return new Date((value - 25569) * 86400 * 1000);
      }
      if (typeof value === 'string') {
        const parts = value.split('/');
        if (parts.length === 3) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        }
      }
      const d = new Date(value);
      return isNaN(d.getTime()) ? new Date() : d;
    };

    // --- IMPORTAÇÃO EXCEL ---
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = xlsx.utils.sheet_to_json(sheet);

      activitiesToCreate = rows.map((row: any) => {
        
        let valLocal, valServico, valInicio, valFim, valCusto, valPeso;

        if (mapping) {
          // Usa o mapeamento estrito fornecido pela tela (De-Para)
          valLocal = row[mapping.local];
          valServico = row[mapping.servico];
          valInicio = row[mapping.inicio];
          valFim = row[mapping.fim];
          valCusto = row[mapping.custo];
          valPeso = row[mapping.peso];
        } else {
          // Fallback: Tentativa inteligente (Importação 1-Click)
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
          peso: 1, // Peso ignorado pois será substituído por Kanban no futuro
        };
      });
    }
    // --- IMPORTAÇÃO MS PROJECT (XML) ---
    else if (filename.endsWith('.xml')) {
      const xmlString = buffer.toString('utf-8');
      const result = await parseStringPromise(xmlString);
      
      const project = result.Project;
      if (!project || !project.Tasks || !project.Tasks[0].Task) {
         return NextResponse.json({ error: 'Formato de XML do MS Project inválido.' }, { status: 400 });
      }

      const tasks = project.Tasks[0].Task;
      
      // Cria um dicionário de tarefas para achar os "pais" (Locais)
      const taskDict: Record<string, any> = {};
      tasks.forEach((t: any) => {
        if (t.UID) taskDict[t.UID[0]] = t;
      });

      tasks.forEach((task: any) => {
        // Ignora tarefas de resumo (pastas principais) e foca apenas nas tarefas "folhas" (serviços reais)
        const isSummary = task.Summary && task.Summary[0] === '1';
        if (isSummary) return;
        
        // Se não for resumo, tenta pegar o nome do pai como "Local"
        let localName = 'Geral';
        // MS Project usa WBS (Estrutura Analítica) ou ParentTaskUID
        const parentWBS = task.WBS ? task.WBS[0].split('.').slice(0, -1).join('.') : null;
        
        // Tenta achar a tarefa pai baseada no WBS (Ex: Se for 1.2.1, o pai é 1.2)
        if (parentWBS) {
          const parentTask = tasks.find((t: any) => t.WBS && t.WBS[0] === parentWBS);
          if (parentTask && parentTask.Name) {
            localName = parentTask.Name[0];
          }
        }

        activitiesToCreate.push({
          local: localName,
          servico: task.Name ? task.Name[0] : 'Tarefa Sem Nome',
          inicio: task.Start ? new Date(task.Start[0]) : new Date(),
          fim: task.Finish ? new Date(task.Finish[0]) : new Date(),
          custo: task.Cost ? Number(task.Cost[0]) : 0,
          peso: task.Work ? Number(task.Work[0].replace('PT','').replace('H','')) : 0, // Simplificação de peso baseado em trabalho
        });
      });
    } 
    // --- MENSAGEM EDUCATIVA PARA .MPP ---
    else if (filename.endsWith('.mpp')) {
      return NextResponse.json({ error: 'Formato fechado da Microsoft não suportado. Por favor, abra o MS Project, vá em "Salvar Como -> Dados XML (*.xml)" e envie o arquivo gerado para garantirmos a precisão.' }, { status: 400 });
    } 
    else {
      return NextResponse.json({ error: 'Formato não suportado. Envie Excel (.xlsx, .csv) ou MS Project (.xml)' }, { status: 400 });
    }

    if (activitiesToCreate.length === 0) {
      return NextResponse.json({ error: 'Nenhuma atividade válida encontrada no arquivo.' }, { status: 400 });
    }

    // --- SALVAR NO BANCO DE DADOS EM TRANSAÇÃO ---
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Desativa versões anteriores e cria nova versão ativa
      await tx.cronogramaVersao.updateMany({
        where: { obraId, ativa: true },
        data: { ativa: false }
      });
      const versao = await tx.cronogramaVersao.create({
        data: {
          nome: file.name,
          ativa: true,
          obraId
        }
      });

      const existingLocations = await tx.location.findMany({ where: { obraId } });
      const existingServices = await tx.service.findMany({ where: { obraId } });
      
      const locMap = new Map(existingLocations.map(l => [l.name.toLowerCase(), l.id]));
      const servMap = new Map(existingServices.map(s => [s.name.toLowerCase(), s.id]));

      let locOrderCounter = existingLocations.length;

      for (const act of activitiesToCreate) {
        // Resolve Local
        const locNameLower = act.local.toLowerCase();
        let locationId = locMap.get(locNameLower);
        if (!locationId) {
          const newLoc = await tx.location.create({
            data: { name: act.local, order: locOrderCounter++, obraId }
          });
          locationId = newLoc.id;
          locMap.set(locNameLower, locationId);
        }

        // Resolve Servico
        const servNameLower = act.servico.toLowerCase();
        let serviceId = servMap.get(servNameLower);
        if (!serviceId) {
          const newServ = await tx.service.create({
            data: { name: act.servico, color: '#3b82f6', obraId }
          });
          serviceId = newServ.id;
          servMap.set(servNameLower, serviceId);
        }

        // Cria a atividade vinculada à VERSÃO do arquivo
        await tx.atividade.create({
          data: {
            name: `${act.servico} - ${act.local}`,
            startDate: act.inicio,
            endDate: act.fim,
            cost: act.custo,
            weight: act.peso,
            locationId,
            serviceId,
            obraId,
            versaoId: versao.id // Vincula à versão criada
          }
        });
      }
      
      return { count: activitiesToCreate.length };
    });

    return NextResponse.json({ message: 'Importação concluída com sucesso', atividadesImportadas: result.count }, { status: 201 });

  } catch (error: any) {
    console.error('Erro na importação:', error);
    return NextResponse.json({ error: 'Erro processando o arquivo. Verifique o formato.' }, { status: 500 });
  }
}
