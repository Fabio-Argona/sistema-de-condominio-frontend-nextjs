'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import StatsCard from '@/components/ui/StatsCard';
import { DashboardActions, DashboardHero, DashboardPage, DashboardSectionTitle } from '@/components/layout/RoleDashboard';
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

  const filaPrioritaria = useMemo(() => [...ocorrencias]
    .filter((ocorrencia) => ocorrencia.status === 'ABERTA' || ocorrencia.status === 'EM_ANDAMENTO')
    .sort((a, b) => new Date(a.dataCriacao || '').getTime() - new Date(b.dataCriacao || '').getTime()), [ocorrencias]);

  const proximasEntregas = useMemo(() => ({
    urgente: filaPrioritaria.filter((ocorrencia) => ocorrencia.prioridade === 'URGENTE' || ocorrencia.prioridade === 'ALTA').length,
  }), [filaPrioritaria]);

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Mantenedor"
        title="Fila técnica do profissional"
        description="Use este painel para priorizar chamados, enxergar urgências e entrar rápido na fila de manutenção."
        status={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={proximasEntregas.urgente > 0 ? 'danger' : 'success'} dot>
              {proximasEntregas.urgente > 0 ? `${proximasEntregas.urgente} chamados prioritários` : 'Sem chamados urgentes'}
            </Badge>
            <Badge variant="info">{ocorrencias.length} ocorrências atribuídas</Badge>
          </div>
        }
        aside={
          <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Situação da fila</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">Abertas</p>
                <p className="mt-1 text-2xl font-black text-rose-600">{resumo.abertas}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">Em andamento</p>
                <p className="mt-1 text-2xl font-black text-amber-600">{resumo.andamento}</p>
              </div>
              <Link href="/dashboard/mantenedor/manutencao">
                <Button className="w-full">Abrir fila de manutenção</Button>
              </Link>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatsCard title="Abertas" value={resumo.abertas} color="red" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm-8.355 2.648h16.71c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L1.913 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
        <StatsCard title="Em andamento" value={resumo.andamento} color="amber" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatsCard title="Concluídas" value={resumo.resolvidas} color="emerald" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
      </div>

      <DashboardActions
        actions={[
          {
            href: '/dashboard/mantenedor/manutencao',
            title: 'Fila completa',
            description: 'Gerencie o backlog técnico e atualize os status de atendimento.',
            accent: 'border-cyan-200/70 bg-gradient-to-br from-cyan-50 to-white dark:border-cyan-900/40 dark:from-cyan-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 3.506a1.875 1.875 0 012.652 2.652l-3.08 3.08a5.625 5.625 0 01-3.898 9.523 5.625 5.625 0 01-1.815-10.95m8.565-2.54a5.625 5.625 0 017.384 7.383l-2.326 2.326a1.875 1.875 0 01-2.652-2.652l2.326-2.326a1.875 1.875 0 00-2.651-2.652l-2.327 2.327a1.875 1.875 0 11-2.651-2.652l2.326-2.326z" /></svg>,
          },
          {
            href: '/dashboard/mantenedor/perfil',
            title: 'Meu perfil',
            description: 'Revise seu acesso e atualize suas informações de conta.',
            accent: 'border-slate-200/70 bg-gradient-to-br from-slate-50 to-white dark:border-slate-800 dark:from-slate-900 dark:to-slate-950',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <DashboardSectionTitle title="Chamados priorizados" description="Primeiro os itens abertos e com maior urgência de resposta." action={<span className="text-sm text-slate-500">{filaPrioritaria.length} pendentes</span>} />
          </CardHeader>
          <CardContent className="space-y-3">
            {filaPrioritaria.slice(0, 6).map((ocorrencia) => (
              <div key={ocorrencia.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{ocorrencia.titulo}</p>
                    <p className="text-xs text-slate-500 mt-1">{ocorrencia.usuarioNome ?? ocorrencia.moradorNome} • Apt {ocorrencia.apartamento}/{ocorrencia.bloco}</p>
                    <p className="text-xs text-slate-500 mt-1">Categoria: {ocorrencia.categoria}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={statusColors[ocorrencia.status]} dot>{statusLabels[ocorrencia.status]}</Badge>
                    <Badge variant={ocorrencia.prioridade === 'URGENTE' || ocorrencia.prioridade === 'ALTA' ? 'danger' : ocorrencia.prioridade === 'MEDIA' ? 'warning' : 'info'}>{ocorrencia.prioridade}</Badge>
                  </div>
                </div>
              </div>
            ))}
            {!isLoading && filaPrioritaria.length === 0 && (
              <p className="text-sm text-slate-500">Nenhum chamado encaminhado para voce ate o momento.</p>
            )}
          </CardContent>
        </Card>

        <Card gradient>
          <CardHeader>
            <DashboardSectionTitle title="Resumo operacional" description="Leitura rápida da sua carga de trabalho atual." />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 dark:border-red-900/40 dark:bg-red-950/20">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Prioridade</p>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{proximasEntregas.urgente}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Chamados urgentes ou altos aguardando ação.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Produtividade</p>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{resumo.resolvidas}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ocorrências concluídas no seu histórico atual.</p>
            </div>
            <Link href="/dashboard/mantenedor/manutencao">
              <Button variant="outline" className="w-full">Ir para tratamento detalhado</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardPage>
  );
}