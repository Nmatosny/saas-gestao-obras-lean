import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as xlsx from 'xlsx';
import { parseStringPromise } from 'xml2js';
import { getWorkspaceSession, validateObraOwnership, unauthorizedResponse } from '@/lib/auth';
import { randomUUID } from 'crypto';
import fs from 'fs';

function logError(error: any) {
  const logMsg = `\n[${new Date().toISOString()}] ${error.message}\n${error.stack || ''}\n`;
  fs.appendFileSync('import-error.log', logMsg);
}

interface ParsedTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  budgetedCost: number;
  weight: number;
  wbs: string;
  outlineLevel: number;
  isSummary: boolean;
  parentId: string | null;
  local: string;
  servico: string;
}

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

    const isOwner = await validateObraOwnership(obraId, workspaceId);
    if (!isOwner) return unauthorizedResponse();

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = file.name.toLowerCase();

    let tasks: ParsedTask[] = [];

    const parseExcelDate = (value: unknown): Date => {
      if (!value) return new Date();
      if (typeof value === 'number') return new Date((value - 25569) * 86400 * 1000);
      if (typeof value === 'string') {
        const parts = value.split('/');
        if (parts.length === 3) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
      const d = new Date(value as string | number | Date);
      return isNaN(d.getTime()) ? new Date() : d;
    };

    if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet);

      const parentStack: { id: string, level: number }[] = [];

      tasks = (rows.map((row) => {
          const getVal = (possibleNames: string[]) => {
            for (const key of Object.keys(row)) {
              if (possibleNames.includes(key.toLowerCase().trim())) return row[key];
            }
            return undefined;
          };

          const name = String(getVal(['nome da tarefa', 'serviço', 'servico', 'atividade', 'tarefa', 'nome', 'descrição', 'descricao', 'item', 'task name', 'descrição da tarefa']) || '');
          if (!name || name === 'undefined' || name.trim() === '') return null;

          let rawStart = getVal(['início', 'inicio', 'data início', 'data inicio', 'start', 'início planejado', 'data inicial', 'data de início', 'data de inicio']);
          let rawEnd = getVal(['término', 'termino', 'fim', 'final', 'finish', 'término planejado', 'data final', 'data de término', 'data de termino']);

          if (!rawStart || !rawEnd) {
            const dateVals = Object.values(row).filter(v => {
              if (typeof v === 'number' && v > 40000 && v < 60000) return true;
              if (typeof v === 'string' && v.includes('/')) return true;
              return false;
            });
            if (!rawStart && dateVals[0]) rawStart = dateVals[0];
            if (!rawEnd && dateVals[1]) rawEnd = dateVals[1];
          }

          const rawWbs = String(getVal(['wbs', 'item', 'id', 'identificador', 'wbs (ett)']) || '');
          const start = parseExcelDate(rawStart);
          const end = parseExcelDate(rawEnd);
          const cost = Number(getVal(['custo', 'valor', 'orçamento', 'total'])) || 0;
        
          const rawLevel = getVal(['nível', 'nivel', 'outline level', 'nível de estrutura', 'level']);
          let level = 0;
          if (typeof rawLevel === 'number') {
            level = rawLevel - 1;
          } else if (typeof rawLevel === 'string' && !isNaN(Number(rawLevel))) {
            level = Number(rawLevel) - 1;
          } else if (rawWbs.includes('.')) {
            level = rawWbs.split('.').length - 1;
          }

          const id = randomUUID();
          let parentId: string | null = null;
          while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= level) {
            parentStack.pop();
          }
          if (parentStack.length > 0) {
            parentId = parentStack[parentStack.length - 1].id;
          }
          parentStack.push({ id, level });

          return {
            id, name, startDate: start, endDate: end, budgetedCost: cost,
            weight: 1, wbs: rawWbs, outlineLevel: level, isSummary: false,
            parentId, local: 'Geral', servico: name
          };
        }).filter(Boolean)) as ParsedTask[];

      const allLevelZero = tasks.every(t => t.outlineLevel === 0);
      if (allLevelZero && tasks.length > 0) {
        const floorKeywords = ['pavimento', 'pav', 'térreo', 'terreo', 'subsolo', 'ático', 'atico', 'cobertura', 'bloco', 'torre', 'nível', 'nivel', 'apto', 'ambiente'];
        let currentParent: ParsedTask | null = null;
        tasks.forEach((t) => {
          const nameLower = t.name.toLowerCase();
          const isFloor = floorKeywords.some(key => nameLower.includes(key));
          if (!isFloor) {
            currentParent = t;
            t.outlineLevel = 0;
            t.isSummary = true;
            t.parentId = null;
          } else if (currentParent) {
            t.parentId = currentParent.id;
            t.outlineLevel = 1;
            t.isSummary = false;
          }
        });
      }
    } 
    else if (filename.endsWith('.xml')) {
      const xmlString = buffer.toString('utf-8');
      const result = await parseStringPromise(xmlString);
      const projectTasks = result.Project?.Tasks?.[0]?.Task || [];
      const idMap = new Map<string, string>();
      
      tasks = projectTasks.map((t: any) => {
        const id = randomUUID();
        const name = t.Name?.[0] || 'Tarefa Sem Nome';
        const start = new Date(t.Start?.[0] || new Date());
        const end = new Date(t.Finish?.[0] || new Date());
        const cost = Number(t.Cost?.[0]) || 0;
        const level = Number(t.OutlineLevel?.[0]) || 0;
        const isSummary = t.Summary?.[0] === '1';
        const wbs = t.WBS?.[0] || '';
        return { id, name, startDate: start, endDate: end, budgetedCost: cost, weight: 1, wbs, outlineLevel: level, isSummary, parentId: null, local: 'Geral', servico: name };
      });

      const stack: { id: string, level: number }[] = [];
      tasks.forEach(t => {
        while (stack.length > 0 && stack[stack.length - 1].level >= t.outlineLevel) stack.pop();
        if (stack.length > 0) t.parentId = stack[stack.length - 1].id;
        if (t.isSummary) stack.push({ id: t.id, level: t.outlineLevel });
      });
    }

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'Nenhuma tarefa válida no arquivo.' }, { status: 400 });
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.cronogramaVersao.create({ data: { nome: file.name, obraId } });
        const taskById = new Map(tasks.map(t => [t.id, t]));
        const getRootName = (t: ParsedTask): string => {
          let cur = t;
          while (cur.parentId) {
            const p = taskById.get(cur.parentId);
            if (!p) break;
            cur = p;
          }
          return cur.name.trim();
        };

        const servicesSet = new Set<string>();
        const locationsSet = new Set<string>();
        tasks.forEach(t => {
          servicesSet.add(getRootName(t));
          if (t.parentId) locationsSet.add(t.name.trim());
        });
        if (servicesSet.size === 0) servicesSet.add('Geral');
        if (locationsSet.size === 0) locationsSet.add('Geral');

        await tx.location.createMany({
          data: Array.from(locationsSet).map(name => ({ name, obraId })),
          skipDuplicates: true,
        });
        await tx.service.createMany({
          data: Array.from(servicesSet).map(name => ({ name, color: '#3b82f6', obraId })),
          skipDuplicates: true,
        });

        const [dbLocs, dbServs] = await Promise.all([
          tx.location.findMany({ where: { obraId } }),
          tx.service.findMany({ where: { obraId } }),
        ]);
        const locMap = new Map(dbLocs.map(l => [l.name.toLowerCase().trim(), l.id]));
        const servMap = new Map(dbServs.map(s => [s.name.toLowerCase().trim(), s.id]));
        const fallbackLocId = dbLocs[0]?.id;
        const fallbackServId = dbServs[0]?.id;

        const taskRows = tasks.map(t => ({
          id: t.id,
          name: t.name,
          startDate: t.startDate,
          endDate: t.endDate,
          budgetedCost: t.budgetedCost,
          weight: t.weight,
          wbs: t.wbs || null,
          outlineLevel: t.outlineLevel,
          isSummary: t.isSummary,
          parentId: t.parentId,
          serviceId: servMap.get(getRootName(t).toLowerCase().trim()) ?? fallbackServId,
          locationId: t.parentId ? (locMap.get(t.name.toLowerCase().trim()) ?? fallbackLocId) : fallbackLocId,
          obraId,
        }));

        const maxLevel = Math.max(0, ...taskRows.map(r => r.outlineLevel));
        for (let lvl = 0; lvl <= maxLevel; lvl++) {
          const batch = taskRows.filter(r => r.outlineLevel === lvl);
          if (batch.length > 0) await tx.atividade.createMany({ data: batch });
        }
      }, { maxWait: 10000, timeout: 60000 });

      return NextResponse.json({ message: 'Importação concluída', count: tasks.length }, { status: 201 });

    } catch (dbError: any) {
      logError(dbError);
      console.error('[import] Erro Prisma:', dbError);
      return NextResponse.json({ 
        error: `Erro no banco: ${dbError.message || 'Erro desconhecido'}`,
        code: dbError.code,
        meta: dbError.meta 
      }, { status: 500 });
    }

  } catch (error: any) {
    logError(error);
    console.error('[import] Erro processamento:', error);
    return NextResponse.json({ error: 'Erro ao processar o arquivo.' }, { status: 500 });
  }
}
