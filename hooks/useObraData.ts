import { useState, useEffect, useCallback } from 'react';
import { Atividade, CronogramaVersao, Dependency, Diario, Obra, Alert } from '@/lib/types';

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
  const [state, setState] = useState({
    obra: null as Obra | null,
    atividades: [] as Atividade[],
    versoes: [] as CronogramaVersao[],
    diarios: [] as Diario[],
    dependencias: [] as Dependency[],
    alerts: [] as Alert[],
    stats: null as CockpitStats | null,
    hasBaseline: false,
    loading: true,
    error: false,
  });

  const carregarDados = useCallback(async () => {
    if (!obraId) return;
    
    setState(prev => ({ ...prev, loading: true, error: false }));
    
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
        setState(prev => ({ ...prev, error: true, loading: false }));
        return;
      }

      setState({
        obra: data.obra,
        atividades: Array.isArray(data.atividades) ? data.atividades : [],
        versoes: Array.isArray(data.versoes) ? data.versoes : [],
        diarios: Array.isArray(data.diarios) ? data.diarios : [],
        dependencias: Array.isArray(data.dependencias) ? data.dependencias : [],
        alerts: Array.isArray(data.alerts) ? data.alerts : [],
        stats: data.stats ?? null,
        hasBaseline: data.hasBaseline === true,
        loading: false,
        error: false
      });
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        console.error('Erro ao carregar cockpit:', err);
        setState(prev => ({ ...prev, error: true, loading: false }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  }, [obraId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  return {
    ...state,
    mutateState: setState,
    refresh: carregarDados
  };
}
