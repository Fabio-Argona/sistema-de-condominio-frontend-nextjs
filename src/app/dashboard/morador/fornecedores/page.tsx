'use client';

import { useEffect, useState } from 'react';
import Card, { CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { Fornecedor } from '@/types';
import { useApi } from '@/hooks/useApi';

export default function MoradorFornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { get, isLoading } = useApi();

  useEffect(() => {
    const load = async () => {
      const data = await get('/fornecedores') as Fornecedor[] | null;
      if (data) setFornecedores(data);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = fornecedores.filter((f) =>
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.comentario || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.contato || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-5xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">

        <div className="animate-slide-up">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Fornecedores Recomendados</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Profissionais e empresas de confiança do condomínio</p>
        </div>

        <div className="animate-slide-up">
          <Input
            placeholder="Buscar por nome, descrição ou contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-slate-200 dark:bg-slate-700/50 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {searchTerm ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado ainda.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-slide-up">
            {filtrados.map((f) => (
              <Card key={f.id} hover gradient>
                <CardContent className="p-5 space-y-3">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow">
                      {f.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{f.nome}</p>
                      {f.valor && (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{f.valor}</p>
                      )}
                    </div>
                  </div>

                  {/* Comentário / O que faz */}
                  {f.comentario && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-l-2 border-blue-200 dark:border-blue-700 pl-3">
                      {f.comentario}
                    </p>
                  )}

                  {/* Detalhes */}
                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                    {f.contato && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {f.contato}
                      </div>
                    )}
                    {f.vigencia && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Contrato vigente até {f.vigencia}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
