import { useState, useEffect } from 'react';

export function useObraData(obraId: string) {
  const [obra, setObra] = useState<any>(null);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [versoes, setVersoes] = useState<any[]>([]);
  const [diarios, setDiarios] = useState<any[]>([]);
  const [dependencias, setDependencias] = useState<any[]>([])
  const [hasBaseline, setHasBaseline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function carregarDados() {
    setLoading(true);
    setError(false);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); 

      const [obrasRes, ativRes, diariosRes, versoesRes, depsRes] = await Promise.all([
        fetch(`/api/obras/${obraId}`, { signal: controller.signal }),
        fetch(`/api/atividades?obraId=${obraId}`, { signal: controller.signal }),
        fetch(`/api/diarios?obraId=${obraId}`, { signal: controller.signal }),
        fetch(`/api/versoes?obraId=${obraId}`, { signal: controller.signal }),
        fetch(`/api/dependencias?obraId=${obraId}`, { signal: controller.signal })
      ]);

      clearTimeout(timeoutId);

      if (obrasRes.ok) setObra(await obrasRes.json());
      if (ativRes.ok) setAtividades(await ativRes.json());
      if (diariosRes.ok) setDiarios(await diariosRes.json());
      if (versoesRes.ok) setVersoes(await versoesRes.json());
      if (depsRes.ok) setDependencias(await depsRes.json());

      const baselineRes = await fetch(`/api/obras/${obraId}/baseline`, { signal: controller.signal });
      if (baselineRes.ok) {
        const bd = await baselineRes.json();
        setHasBaseline(bd.hasBaseline === true);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(true);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (obraId) {
      carregarDados();
    }
  }, [obraId]);

  return {
    obra,
    atividades,
    versoes,
    diarios,
    dependencias,
    hasBaseline,
    loading,
    error,
    refresh: carregarDados
  };
}
