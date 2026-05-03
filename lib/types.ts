/**
 * CORE TYPES (Enterprise Standard)
 */

export interface Service {
  id: string;
  name: string;
  color: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface Restricao {
  id: string;
  descricao: string;
  resolvido: boolean;
}

export interface Atividade {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  progress: number;
  weight: number;
  status: 'planejado' | 'em_andamento' | 'concluido' | 'impedido';
  scheduled?: boolean;
  service?: Service;
  location?: Location;
  quantidadeTotal?: number;
  unidadeMedida?: string;
  quantidadeRealizada?: number;
  isCritical?: boolean;
  causaNaoCumprimento?: string;
  impactoDescricao?: string;
  restricoes?: Restricao[];
  plannedProgress?: number;
}

export interface Obra {
  id: string;
  nome: string;
  descricao?: string;
  endereco?: string;
  engenheiro?: string;
  status: string;
  progress: number;
}

export interface DiarioAtividade {
  id: string;
  atividadeId: string;
  progress: number;
  quantidadeRealizada: number;
  status?: string;
  atividade?: Atividade;
}

export interface Diario {
  id: string;
  date: string | Date;
  weatherMorning?: string;
  weatherAfternoon?: string;
  weatherNight?: string;
  notes?: string;
  atividades: DiarioAtividade[];
}

export interface Alert {
  id: string;
  severity: 'critico' | 'atencao' | 'ok';
  title: string;
  message: string;
  action: string;
  actionTab?: string;
  meta?: Record<string, unknown>;
}

export interface FinanceData {
  spi: number;
  cpi: number;
  vac: number;
  eac?: number;
}
