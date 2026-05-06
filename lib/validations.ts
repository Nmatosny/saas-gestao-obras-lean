import { z } from "zod";

/**
 * Esquemas de Validação (Nível Enterprise)
 * Garante que os payloads de API sejam robustos e tipados.
 */

export const obraSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  descricao: z.string().optional(),
  endereco: z.string().optional(),
  engenheiro: z.string().optional(),
});

export const resourceSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  type: z.enum(['EMPREITEIRA', 'FUNCIONARIO']),
  role: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  hourlyRate: z.number().optional().default(0),
});

export const atividadeSchema = z.object({
  id: z.string().optional(),
  status: z.enum(['planejado', 'em_andamento', 'concluido']).optional(),
  progress: z.number().min(0).max(100).optional(),
  scheduled: z.boolean().optional(),
  causaNaoCumprimento: z.string().optional().nullable(),
  impactoDescricao: z.string().optional().nullable(),
  budgetedCost: z.number().optional(),
});

export const diarioSchema = z.object({
  obraId: z.string().cuid("ID de obra inválido"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data inválida",
  }),
  weatherMorning: z.string().optional().nullable(),
  weatherAfternoon: z.string().optional().nullable(),
  weatherNight: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  ocorrencias: z.string().optional().nullable(),
  equipamentos: z.string().optional().nullable(),
  efetivos: z.array(z.object({
    role: z.string(),
    count: z.number().min(0)
  })).optional(),
  atividades: z.array(z.object({
    atividadeId: z.string(),
    progress: z.number().min(0).max(100),
    quantidadeRealizada: z.number().min(0).optional().default(0),
    status: z.string(),
    quantidadeTrabalhadores: z.number().optional().default(0),
    actualManHours: z.number().optional().nullable(),
    fotosAtividade: z.array(z.string()).optional(),
    efetivoIndices: z.array(z.number()).optional(),
  })).optional(),
  fotos: z.array(z.object({
    url: z.string(),
    caption: z.string().optional().nullable(),
  })).optional(),
});
