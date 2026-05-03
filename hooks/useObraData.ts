import { useState, useEffect, useCallback } from 'react';
import { Atividade, Diario, Obra, Alert } from '@/lib/types';

export interface CockpitStats {
  progresso: number;
  progressoPlanejado: number;
  desvio: number;
  ppc: number;
  spi: number;
  projecaoTermino: string | null;
  atrasoEstimadoDias: number;
}

/**
 * Hook useObraData v4 (Strict Mode)
 * Consome o Cockpit API com tipagem 100% definida e hooks otimizados.
 */
export function useObraData(obraId: string) {
  const [obra, setObra] = useState<Obra | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [versoes, setVersoes] = useState<any[]>([]);
  const [diarios, setDiarios] = useState<Diario[]>([]);
  const [dependencias, setDependencias] = useState<any[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<CockpitStats | null>(null)
  const [hasBaseline, setHasBaseline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!obraId) return;
    
    // Inicia carregamento
    setLoading(true);
    setError(false);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); 

      const res = await fetch(`/api/obras/${obraId}/cockpit`, { 
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' } 
      });

      clearTimeout(timeoutId);

      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        window.location.href = '/api/auth/signin';
        return;
      }

      if (!res.ok || !data?.obra) {
        setError(true);
        setLoading(false);
        return;
      }

      setObra(data.obra);
      setAtividades(Array.isArray(data.atividades) ? data.atividades : []);
      setDiarios(Array.isArray(data.diarios) ? data.diarios : []);
      setVersoes(Array.isArray(data.versoes) ? data.versoes : []);
      setDependencias(Array.isArray(data.dependencias) ? data.dependencias : []);
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      setStats(data.stats ?? null);
      setHasBaseline(data.hasBaseline === true);
      setLoading(false);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Erro ao carregar cockpit:', err);
        setError(true);
      }
      setLoading(false);
    }
  }, [obraId]);

  useEffect(() => {
    // Chama a função assíncrona que gerencia seu próprio estado de loading
    carregarDados();
  }, [carregarDados]);

  return {
    obra,
    atividades,
    versoes,
    diarios,
    dependencias,
    alerts,
    stats,
    hasBaseline,
    loading,
    error,
    refresh: carregarDados
  };
}
