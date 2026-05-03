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

export const atividadeSchema = z.object({
  id: z.string().optional(),
  status: z.enum(['planejado', 'em_andamento', 'concluido']).optional(),
  progress: z.number().min(0).max(100).optional(),
  scheduled: z.boolean().optional(),
  causaNaoCumprimento: z.string().optional().nullable(),
  impactoDescricao: z.string().optional().nullable(),
  custoOrcado: z.number().optional(),
});

export const diarioSchema = z.object({
  obraId: z.string(),
  date: z.string(), // ISO string
  weatherMorning: z.string().optional(),
  weatherAfternoon: z.string().optional(),
  weatherNight: z.string().optional(),
  notes: z.string().optional(),
  atividades: z.array(z.object({
    atividadeId: z.string(),
    progress: z.number().min(0).max(100),
    status: z.string(),
    quantidadeTrabalhadores: z.number().optional(),
  })).optional(),
});
