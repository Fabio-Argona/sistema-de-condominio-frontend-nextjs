'use client';

import { useState, useEffect } from 'react';
import Card, { CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { Morador } from '@/types';
import { useApi } from '@/hooks/useApi';

export default function PorteiroConsultaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const { get, isLoading } = useApi();

  useEffect(() => {
    const fetchMoradores = async () => {
      const data = await get('/moradores') as Morador[];
      if (data) {
        setMoradores(data);
      }
    };
    fetchMoradores();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMoradores = searchTerm.length >= 1
    ? moradores.filter((m) =>
        (m.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (m.apartamento || '').includes(searchTerm) ||
        (m.bloco?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (m.telefone || '').includes(searchTerm)
      )
    : moradores;

  const moradoresOrdenados = [...filteredMoradores].sort((a, b) =>
    (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
  );

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-5xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
      <div className="animate-slide-up">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Consulta Rápida</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Busque moradores e apartamentos do condomínio</p>
      </div>

      <div className="animate-slide-up">
        <Input
          placeholder="Buscar por nome, apartamento, bloco ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xl"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading && moradores.length === 0 ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className={`h-28 bg-slate-200 dark:bg-slate-700/50 rounded-2xl animate-pulse stagger-${Math.min(i + 1, 6)}`} />
          ))
        ) : moradoresOrdenados.map((m, i) => (
          <Card key={m.id} hover gradient className={`animate-slide-up stagger-${Math.min(i + 1, 6)}`}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${m.ativo ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                  {m.nome ? m.nome.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 dark:text-white">{m.nome}</h3>
                    <Badge variant={m.ativo ? 'success' : 'danger'} size="sm">{m.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
                    <p className="flex items-center gap-1.5 capitalize">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                      </svg>
                      Apt {m.apartamento} - Bloco {m.bloco}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.114-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                      </svg>
                      {m.telefone || 'Sem telefone'}
                    </p>
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
