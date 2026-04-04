'use client';

import { useEffect, useMemo, useState } from 'react';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useApi } from '@/hooks/useApi';
import { LogAcesso, Visitante } from '@/types';

const roleLabel: Record<string, string> = {
  SINDICO: 'Síndico',
  MORADOR: 'Morador',
  PORTEIRO: 'Porteiro',
};

export default function SegurancaPage() {
  const [logs, setLogs] = useState<LogAcesso[]>([]);
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { get } = useApi();

  useEffect(() => {
    const load = async () => {
      try {
        const [logsData, visitantesData] = await Promise.all([
          get('/log-acessos') as Promise<LogAcesso[]>,
          get('/visitantes') as Promise<Visitante[]>,
        ]);

        setLogs(logsData || []);
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

    const acessosUltimas24h = logs.filter((l) => {
      const data = new Date(l.dataHora).getTime();
      return Date.now() - data <= 24 * 60 * 60 * 1000;
    }).length;

    const semSaida = visitantes.filter((v) => !v.dataSaida).length;

    return { visitantesHoje, acessosUltimas24h, semSaida };
  }, [logs, visitantes]);

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
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ocorrências de acesso, visitantes e monitoramento operacional</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Visitantes Hoje</p><p className="text-3xl font-bold text-blue-600">{resumo.visitantesHoje}</p></CardContent></Card>
          <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Acessos (24h)</p><p className="text-3xl font-bold text-indigo-600">{resumo.acessosUltimas24h}</p></CardContent></Card>
          <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Visitantes em Permanência</p><p className="text-3xl font-bold text-amber-600">{resumo.semSaida}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card gradient>
            <CardHeader>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Registros de Acesso Recentes</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {logs.slice(0, 8).map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{log.usuarioNome}</p>
                    <Badge variant="info">{roleLabel[log.role] || log.role}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{new Date(log.dataHora).toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-slate-500">IP: {log.ip || 'N/A'}</p>
                </div>
              ))}
              {logs.length === 0 && <p className="text-sm text-slate-500">Sem registros de acesso.</p>}
            </CardContent>
          </Card>

          <Card gradient>
            <CardHeader>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Visitantes e Prestadores</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {visitantes.slice(0, 8).map((visitante) => (
                <div key={visitante.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{visitante.nome}</p>
                    <Badge variant={visitante.dataSaida ? 'success' : 'warning'}>{visitante.dataSaida ? 'Finalizado' : 'Em andamento'}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Morador: {visitante.moradorNome}</p>
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
