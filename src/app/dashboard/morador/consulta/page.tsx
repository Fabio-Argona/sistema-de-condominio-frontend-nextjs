'use client';

import { useState, useEffect } from 'react';
import Card, { CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { Morador } from '@/types';
import { useApi } from '@/hooks/useApi';

export default function MoradorConsultaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const { get, isLoading } = useApi();

  useEffect(() => {
    const fetchMoradores = async () => {
      const data = await get('/moradores') as Morador[];
      if (data) {
        setMoradores(data.filter(m => m.ativo));
      }
    };
    fetchMoradores();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMoradores = searchTerm.length >= 1
    ? moradores.filter((m) =>
        (m.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (m.apartamento || '').includes(searchTerm) ||
        (m.bloco?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      )
    : moradores;

  const moradoresOrdenados = [...filteredMoradores].sort((a, b) =>
    (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
  );

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-5xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">

        <div className="animate-slide-up">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Consulta de Moradores</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Encontre moradores e apartamentos do condomínio</p>
        </div>

        <div className="animate-slide-up">
          <Input
            placeholder="Buscar por nome, apartamento ou bloco..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xl"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading && moradores.length === 0 ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className={`h-24 bg-slate-200 dark:bg-slate-700/50 rounded-2xl animate-pulse`} />
            ))
          ) : moradoresOrdenados.map((m, i) => (
            <Card key={m.id} hover gradient className={`animate-slide-up stagger-${Math.min(i + 1, 6)}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0">
                    {m.nome ? m.nome.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate">{m.nome}</h3>
                    </div>
                    <div className="space-y-0.5 text-sm text-slate-500 dark:text-slate-400">
                      <p>🏠 Apt {m.apartamento} — Bloco {m.bloco}</p>
                      {m.telefone && <p>📞 {m.telefone}</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!isLoading && moradoresOrdenados.length === 0 && (
          <div className="text-center py-12 text-slate-400 animate-slide-up">
            <p className="text-lg">Nenhum morador encontrado</p>
            <p className="text-sm mt-1">Tente buscar por outro termo</p>
          </div>
        )}

      </div>
    </div>
  );
}
