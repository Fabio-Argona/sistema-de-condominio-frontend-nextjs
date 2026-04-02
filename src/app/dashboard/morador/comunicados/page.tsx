'use client';

import { useState, useEffect } from 'react';
import Card, { CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Comunicado } from '@/types';
import { useApi } from '@/hooks/useApi';

export default function MoradorComunicadosPage() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { get, isLoading } = useApi<Comunicado[]>();

  const loadComunicados = async () => {
    const data = await get('/comunicados');
    if (data) setComunicados(data);
  };

  useEffect(() => {
    loadComunicados();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading && comunicados.length === 0) return <div className="space-y-4 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}</div>;

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-5xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
      <div className="animate-slide-up">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Comunicados</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Fique por dentro das novidades do condomínio</p>
      </div>
      <div className="space-y-4">
        {comunicados.length === 0 ? (
          <p className="text-slate-500 py-8 text-center text-lg">Nenhum comunicado no momento.</p>
        ) : (
          comunicados.map((c, i) => (
            <Card key={c.id} hover gradient className={`animate-slide-up stagger-${i % 5 + 1}`}>
              <CardContent className="p-6 cursor-pointer" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {c.importante && <Badge variant="danger" dot>Importante</Badge>}
                  <Badge variant="info">{c.categoria}</Badge>
                  <span className="text-xs text-slate-400">{c.dataCriacao}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{c.titulo}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{expandedId === c.id ? c.conteudo : c.conteudo.substring(0, 120) + (c.conteudo.length > 120 ? '...' : '')}</p>
                <p className="text-xs text-slate-400 mt-2">Por: {c.autor}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </div>
    </div>
  );
}
