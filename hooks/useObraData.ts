import { useState, useEffect, useCallback } from 'react';

export interface ObraData {
  id: string;
  nome: string;
  descricao?: string;
  endereco?: string;
  engenheiro?: string;
}

/**
 * Hook useObraData v2 (BFF Driven)
 * Consome o Cockpit API unificado para garantir sincronização total (P1).
 */
export function useObraData(obraId: string) {
  const [obra, setObra] = useState<ObraData | null>(null);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [versoes, setVersoes] = useState<any[]>([]);
  const [diarios, setDiarios] = useState<any[]>([]);
  const [dependencias, setDependencias] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [hasBaseline, setHasBaseline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    setError(false);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); 

      // Chamada ÚNICA ao Cockpit BFF
      const res = await fetch(`/api/obras/${obraId}/cockpit`, { 
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' } 
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setObra(data.obra);
        setAtividades(data.atividades);
        setDiarios(data.diarios);
        setVersoes(data.versoes);
        setDependencias(data.dependencias);
        setAlerts(data.alerts);
        setStats(data.stats);
        setHasBaseline(data.hasBaseline);
      } else {
        setError(true);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar cockpit:', err);
      setError(true);
      setLoading(false);
    }
  }, [obraId]);

  useEffect(() => {
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
