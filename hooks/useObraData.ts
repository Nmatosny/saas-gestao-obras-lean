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

      // Tenta parsear o JSON independente do status HTTP
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // JSON inválido — erro real de rede/servidor
        setError(true);
        setLoading(false);
        return;
      }

      if (res.status === 401 || res.status === 403) {
        // Auth error — redireciona para login em vez de tela de erro genérica
        window.location.href = '/api/auth/signin';
        return;
      }

      if (!res.ok || !data?.obra) {
        // 404 ou 500 sem payload utilizável
        console.error('Cockpit API retornou erro:', data?.error, data?.details);
        setError(true);
        setLoading(false);
        return;
      }

      // Hidrata com fallbacks defensivos para cada campo opcional
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
      if (err?.name === 'AbortError') {
        console.warn('Cockpit API timeout');
      } else {
        console.error('Erro ao carregar cockpit:', err);
      }
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
