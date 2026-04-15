'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { Ocorrencia, OcorrenciaStatus } from '@/types';

const statusLabels: Record<OcorrenciaStatus, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em andamento',
  RESOLVIDA: 'Resolvida',
  FECHADA: 'Fechada',
};

const statusColors: Record<OcorrenciaStatus, 'danger' | 'warning' | 'success' | 'info'> = {
  ABERTA: 'danger',
  EM_ANDAMENTO: 'warning',
  RESOLVIDA: 'success',
  FECHADA: 'info',
};

export default function DashboardMantenedorPage() {
  const { user } = useAuth();
  const { get, isLoading } = useApi<Ocorrencia[]>();
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);

  useEffect(() => {
    const loadOcorrencias = async () => {
      if (!user?.id) {
        return;
      }
      const data = await get(`/ocorrencias/profissional/${user.id}`) as Ocorrencia[];
      if (data) {
        setOcorrencias(data);
      }
    };

    loadOcorrencias();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const resumo = useMemo(() => ({
    abertas: ocorrencias.filter((ocorrencia) => ocorrencia.status === 'ABERTA').length,
    andamento: ocorrencias.filter((ocorrencia) => ocorrencia.status === 'EM_ANDAMENTO').length,
    resolvidas: ocorrencias.filter((ocorrencia) => ocorrencia.status === 'RESOLVIDA' || ocorrencia.status === 'FECHADA').length,
  }), [ocorrencias]);

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-6xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Painel do Profissional</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Acompanhe os chamados e ocorrências encaminhados para você.</p>
          </div>
          <Link href="/dashboard/mantenedor/manutencao">
            <Button>Ver fila de manutenção</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Abertas</p><p className="text-3xl font-bold text-rose-600">{resumo.abertas}</p></CardContent></Card>
          <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Em andamento</p><p className="text-3xl font-bold text-amber-600">{resumo.andamento}</p></CardContent></Card>
          <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Concluidas</p><p className="text-3xl font-bold text-emerald-600">{resumo.resolvidas}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Chamados recebidos</h2>
              <span className="text-sm text-slate-500">{ocorrencias.length} ocorrências</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {ocorrencias.slice(0, 6).map((ocorrencia) => (
              <div key={ocorrencia.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{ocorrencia.titulo}</p>
                    <p className="text-xs text-slate-500 mt-1">{ocorrencia.usuarioNome ?? ocorrencia.moradorNome} • Apt {ocorrencia.apartamento}/{ocorrencia.bloco}</p>
                    <p className="text-xs text-slate-500 mt-1">Categoria: {ocorrencia.categoria}</p>
                  </div>
                  <Badge variant={statusColors[ocorrencia.status]} dot>{statusLabels[ocorrencia.status]}</Badge>
                </div>
              </div>
            ))}
            {!isLoading && ocorrencias.length === 0 && (
              <p className="text-sm text-slate-500">Nenhum chamado encaminhado para voce ate o momento.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}