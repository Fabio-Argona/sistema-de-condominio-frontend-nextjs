'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useApi } from '@/hooks/useApi';
import { Ocorrencia, Visitante } from '@/types';

export default function SegurancaPage() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { get } = useApi();

  useEffect(() => {
    const load = async () => {
      try {
        const [ocData, visitantesData] = await Promise.all([
          get('/ocorrencias') as Promise<Ocorrencia[]>,
          get('/visitantes') as Promise<Visitante[]>,
        ]);

        setOcorrencias(ocData || []);
        setVisitantes(visitantesData || []);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumo = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const visitantesHoje = visitantes.filter((v) => {
      const entrada = new Date(v.dataEntrada);
      entrada.setHours(0, 0, 0, 0);
      return entrada.getTime() === hoje.getTime();
    }).length;

    const semSaida = visitantes.filter((v) => !v.dataSaida).length;

    const ocSeguranca = ocorrencias.filter(
      (o) =>
        (o.categoria === 'SEGURANCA' || o.categoria === 'Segurança') &&
        (o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO')
    );

    return { visitantesHoje, semSaida, ocSeguranca };
  }, [ocorrencias, visitantes]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-6xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
        <div className="animate-slide-up">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Segurança</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ocorrências de segurança, visitantes e monitoramento operacional</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Visitantes Hoje</p><p className="text-3xl font-bold text-blue-600">{resumo.visitantesHoje}</p></CardContent></Card>
          <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Visitantes em Permanência</p><p className="text-3xl font-bold text-amber-600">{resumo.semSaida}</p></CardContent></Card>
          <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Ocorrências de Segurança</p><p className="text-3xl font-bold text-rose-600">{resumo.ocSeguranca.length}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card gradient>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Ocorrências de Segurança Abertas</h2>
                <Link href="/dashboard/sindico/ocorrencias" className="text-sm text-blue-500 hover:text-blue-400 font-medium">Ver todas →</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {resumo.ocSeguranca.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma ocorrência de segurança em aberto.</p>
              ) : resumo.ocSeguranca.slice(0, 8).map((o) => (
                <div key={o.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{o.titulo}</p>
                    <Badge variant={o.status === 'ABERTA' ? 'danger' : 'warning'} dot>
                      {o.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{o.usuarioNome ?? o.moradorNome} • Apt {o.apartamento}/{o.bloco}</p>
                  <p className="text-xs text-slate-500">{new Date(o.dataCriacao).toLocaleDateString('pt-BR')}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card gradient>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Visitantes e Prestadores</h2>
                <Link href="/dashboard/sindico/acessos" className="text-sm text-blue-500 hover:text-blue-400 font-medium">Log completo →</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {visitantes.slice(0, 8).map((visitante) => (
                <div key={visitante.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{visitante.nome}</p>
                    <Badge variant={visitante.dataSaida ? 'success' : 'warning'}>{visitante.dataSaida ? 'Finalizado' : 'Em andamento'}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Usuário: {visitante.usuarioNome ?? visitante.moradorNome}</p>
                  <p className="text-xs text-slate-500">Entrada: {new Date(visitante.dataEntrada).toLocaleString('pt-BR')}</p>
                </div>
              ))}
              {visitantes.length === 0 && <p className="text-sm text-slate-500">Sem visitantes registrados.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
