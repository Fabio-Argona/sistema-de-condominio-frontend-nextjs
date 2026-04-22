'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import StatsCard from '@/components/ui/StatsCard';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { DashboardActions, DashboardHero, DashboardPage, DashboardSectionTitle } from '@/components/layout/RoleDashboard';
import { Boleto, Comunicado, Ocorrencia, Reserva, Usuario, Visitante } from '@/types';
import { useApi } from '@/hooks/useApi';
import { getAgoraBR, parseDataBR, formatarDataBR } from '@/utils/dateUtils';


const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  ABERTA: 'danger',
  EM_ANDAMENTO: 'warning',
  RESOLVIDA: 'success',
  FECHADA: 'info',
  APROVADA: 'success',
  PENDENTE: 'warning',
  REJEITADA: 'danger',
  CANCELADA: 'info',
};

const statusLabels: Record<string, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em andamento',
  RESOLVIDA: 'Resolvida',
  FECHADA: 'Fechada',
  APROVADA: 'Aprovada',
  PENDENTE: 'Pendente',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
};

const prioridadeColors: Record<string, 'danger' | 'warning' | 'info' | 'success'> = {
  URGENTE: 'danger',
  ALTA: 'danger',
  MEDIA: 'warning',
  BAIXA: 'info',
};

export default function SindicoDashboard() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [comunicadosRecentes, setComunicadosRecentes] = useState<Comunicado[]>([]);
  const [reservasRecentes, setReservasRecentes] = useState<Reserva[]>([]);
  const [boletosVencidos, setBoletosVencidos] = useState<Boleto[]>([]);
  const [sendingCobranca, setSendingCobranca] = useState<number | null>(null);
  const [totalReservasHoje, setTotalReservasHoje] = useState<number>(0);
  const [visitantesHoje, setVisitantesHoje] = useState<number>(0);
  const [totalUsuarios, setTotalUsuarios] = useState<number>(0);
  const [totalUnidades, setTotalUnidades] = useState<number>(0);
  const [ocorrenciasAbertas, setOcorrenciasAbertas] = useState<number>(0);
  const [receitaMensal, setReceitaMensal] = useState<number>(0);
  const [boletosVencidosMes, setBoletosVencidosMes] = useState<number>(0);
  const [boletosVencidosTotal, setBoletosVencidosTotal] = useState<number>(0);
  const [taxaAdimplencia, setTaxaAdimplencia] = useState<string>('0.0');
  const [isLoading, setIsLoading] = useState(true);

  const { get, post } = useApi();

  useEffect(() => {
    const toDateOnly = (value?: string) => {
      if (!value) return null;
      return parseDataBR(value);
    };

    const isToday = (value?: string) => {
      const d = toDateOnly(value);
      if (!d || Number.isNaN(d.getTime())) return false;
      const now = getAgoraBR();
      now.setHours(0, 0, 0, 0);
      return d.getTime() === now.getTime();
    };

    const loadDashboardData = async () => {
      try {
        const [ocData, resData, visData, morData, boletosData, comunicadosData] = await Promise.all([
          get('/ocorrencias') as Promise<Ocorrencia[]>,
          get('/reservas') as Promise<Reserva[]>,
          get('/visitantes') as Promise<Visitante[]>,
          get('/usuarios') as Promise<Usuario[]>,
          get('/boletos') as Promise<Boleto[]>,
          get('/comunicados') as Promise<Comunicado[]>,
        ]);

        if (ocData) {
          const recentes = [...ocData]
            .filter((item) => item.status !== 'RESOLVIDA' && item.status !== 'FECHADA')
            .sort((a, b) => new Date(b.dataCriacao || '').getTime() - new Date(a.dataCriacao || '').getTime())
            .slice(0, 5);
          setOcorrencias(recentes);
          setOcorrenciasAbertas(ocData.filter((item) => item.status === 'ABERTA' || item.status === 'EM_ANDAMENTO').length);
        }

        if (resData) {
          setTotalReservasHoje(resData.filter((item) => isToday(item.dataReserva)).length);

          const recentes = [...resData]
            .filter((item) => item.status === 'PENDENTE')
            .sort((a, b) => new Date(a.dataReserva || '').getTime() - new Date(b.dataReserva || '').getTime())
            .slice(0, 4);
          setReservasRecentes(recentes);
        }

        if (visData) {
          setVisitantesHoje(visData.filter((item) => isToday(item?.dataEntrada)).length);
        }

        if (morData) {
          const ativos = morData.filter((item) => item?.ativo !== false);
          setTotalUsuarios(ativos.length);
          const unidadesUnicas = new Set(ativos.map((item) => `${item?.bloco || '-'}-${item?.apartamento || '-'}`));
          setTotalUnidades(unidadesUnicas.size);
        }

        if (comunicadosData) {
          setComunicadosRecentes([...comunicadosData]
            .sort((a, b) => new Date(b.dataCriacao || '').getTime() - new Date(a.dataCriacao || '').getTime())
            .slice(0, 4));
        }

        if (boletosData) {
          const now = getAgoraBR();
          now.setHours(0, 0, 0, 0);
          const mesAtual = now.getMonth();
          const anoAtual = now.getFullYear();

          const receita = boletosData
            .filter((item) => (item.status || '').toUpperCase() === 'PAGO')
            .filter((item) => {
              const baseData = item.dataPagamento ? new Date(item.dataPagamento) : parseDataBR(item.dataVencimento);
              return baseData.getMonth() === mesAtual && baseData.getFullYear() === anoAtual;
            })
            .reduce((total, item) => total + (item.valor || 0), 0);
          setReceitaMensal(receita);

          const baseCobrancas = boletosData.filter((item) => parseDataBR(item.dataVencimento) <= now);
          const pagosBase = baseCobrancas.filter((item) => (item.status || '').toUpperCase() === 'PAGO').length;
          const taxa = baseCobrancas.length > 0 ? (pagosBase / baseCobrancas.length) * 100 : 100;
          setTaxaAdimplencia(taxa.toFixed(1));

          const vencidosMes = boletosData.filter((item) => {
            const venc = parseDataBR(item.dataVencimento);
            const status = (item.status || '').toUpperCase();
            const mesmoMes = venc.getMonth() === mesAtual && venc.getFullYear() === anoAtual;
            return mesmoMes && status !== 'PAGO' && venc < now;
          }).length;
          setBoletosVencidosMes(vencidosMes);

          const vencidosTotal = boletosData.filter((item) => {
            const venc = parseDataBR(item.dataVencimento);
            const status = (item.status || '').toUpperCase();
            return status !== 'PAGO' && venc < now;
          });
          setBoletosVencidosTotal(vencidosTotal.length);
          setBoletosVencidos([...vencidosTotal]
            .sort((a, b) => parseDataBR(a.dataVencimento).getTime() - parseDataBR(b.dataVencimento).getTime())
            .slice(0, 5));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnviarCobranca = async (boleto: Boleto) => {
    setSendingCobranca(boleto.id);
    try {
      const res = await post(`/boletos/${boleto.id}/enviar-cobranca`, {});
      if (res !== null) {
        toast.success(`E-mail de cobrança enviado para ${boleto.usuarioNome ?? boleto.moradorNome}!`);
      }
    } catch {
      toast.error('Falha ao enviar e-mail de cobrança.');
    } finally {
      setSendingCobranca(null);
    }
  };

  const prioridades = useMemo(() => ({
    criticas: ocorrencias.filter((item) => item.prioridade === 'URGENTE' || item.prioridade === 'ALTA').length,
    comunicadosImportantes: comunicadosRecentes.filter((item) => item.importante).length,
  }), [comunicadosRecentes, ocorrencias]);

  if (isLoading) {
    return (
      <DashboardPage>
        <div className="space-y-6 animate-pulse">
          <div className="h-44 rounded-[28px] bg-slate-200 dark:bg-slate-800" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Síndico"
        title="Visão operacional do condomínio"
        description="Um painel para decidir rápido: inadimplência, reservas pendentes, ocorrências abertas, fluxo de visitantes e comunicação recente em um só lugar."
        status={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={boletosVencidosTotal > 0 ? 'danger' : 'success'} dot>
              {boletosVencidosTotal > 0 ? `${boletosVencidosTotal} boletos vencidos` : 'Sem boletos vencidos'}
            </Badge>
            <Badge variant={prioridades.criticas > 0 ? 'warning' : 'info'}>{prioridades.criticas} ocorrências críticas</Badge>
            <Badge variant="info">{getAgoraBR().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</Badge>
          </div>
        }
        aside={
          <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Resumo do dia</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">Taxa de adimplência</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{taxaAdimplencia}%</p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">Receita no mês</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">R$ {receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Usuários ativos" value={totalUsuarios} color="blue" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>} />
        <StatsCard title="Unidades cadastradas" value={totalUnidades} color="indigo" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>} />
        <StatsCard title="Ocorrências abertas" value={ocorrenciasAbertas} color="amber" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm-8.355 2.648h16.71c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L1.913 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
        <StatsCard title="Reservas para hoje" value={totalReservasHoje} color="emerald" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>} />
      </div>

      <DashboardActions
        actions={[
          {
            href: '/dashboard/sindico/financeiro',
            title: 'Financeiro',
            description: 'Receita, inadimplência e análise do caixa condominial.',
            accent: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          },
          {
            href: '/dashboard/sindico/manutencao',
            title: 'Manutenção',
            description: 'Trate chamados técnicos e acompanhe pendências operacionais.',
            accent: 'border-amber-200/70 bg-gradient-to-br from-amber-50 to-white dark:border-amber-900/40 dark:from-amber-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 3.506a1.875 1.875 0 012.652 2.652l-3.08 3.08a5.625 5.625 0 01-3.898 9.523 5.625 5.625 0 01-1.815-10.95m8.565-2.54a5.625 5.625 0 017.384 7.383l-2.326 2.326a1.875 1.875 0 01-2.652-2.652l2.326-2.326a1.875 1.875 0 00-2.651-2.652l-2.327 2.327a1.875 1.875 0 11-2.651-2.652l2.326-2.326z" /></svg>,
          },
          {
            href: '/dashboard/sindico/comunicados',
            title: 'Comunicados',
            description: 'Publique avisos e acompanhe a comunicação com moradores.',
            accent: 'border-sky-200/70 bg-gradient-to-br from-sky-50 to-white dark:border-sky-900/40 dark:from-sky-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535" /></svg>,
          },
          {
            href: '/dashboard/sindico/seguranca',
            title: 'Segurança',
            description: 'Visualize visitantes, acessos e alertas de movimentação.',
            accent: 'border-indigo-200/70 bg-gradient-to-br from-indigo-50 to-white dark:border-indigo-900/40 dark:from-indigo-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m6 2.354c0 4.373-3.438 8.354-8.25 9.896C7.938 20.458 4.5 16.477 4.5 12.104V6.75A1.5 1.5 0 016 5.25c1.757 0 3.43-.514 4.852-1.476l.398-.268a1.5 1.5 0 011.7 0l.398.268A8.25 8.25 0 0018 5.25a1.5 1.5 0 011.5 1.5v5.354z" /></svg>,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card gradient>
            <CardHeader>
              <DashboardSectionTitle title="Prioridades de gestão" description="Ocorrências abertas e reservas aguardando decisão." action={<Link href="/dashboard/sindico/manutencao" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Abrir manutenção</Link>} />
            </CardHeader>
            <CardContent className="space-y-3">
              {ocorrencias.map((ocorrencia) => (
                <div key={ocorrencia.id} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{ocorrencia.titulo}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ocorrencia.usuarioNome ?? ocorrencia.moradorNome} • Apt {ocorrencia.apartamento} Bloco {ocorrencia.bloco}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={statusColors[ocorrencia.status] || 'info'} dot>{statusLabels[ocorrencia.status] || ocorrencia.status}</Badge>
                      <Badge variant={prioridadeColors[ocorrencia.prioridade] || 'info'} size="sm">{ocorrencia.prioridade}</Badge>
                    </div>
                  </div>
                </div>
              ))}
              {ocorrencias.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma ocorrência aberta.</p>
              )}
              {reservasRecentes.length > 0 && (
                <div className="space-y-3 pt-2">
                  {reservasRecentes.map((reserva) => (
                    <div key={reserva.id} className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{reserva.areaComumNome}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{reserva.usuarioNome ?? reserva.moradorNome} • {formatarDataBR(reserva.dataReserva)} • {reserva.horaInicio} - {reserva.horaFim}</p>
                        </div>
                        <Badge variant="warning">Pendente</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {boletosVencidos.length > 0 && (
            <Card gradient className="border-red-200 dark:border-red-900/40">
              <CardHeader>
                <DashboardSectionTitle title="Cobranças urgentes" description="Moradores com boletos vencidos que pedem ação rápida." action={<Link href="/dashboard/sindico/pagamentos" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Ver inadimplência</Link>} />
              </CardHeader>
              <CardContent className="space-y-3">
                {boletosVencidos.map((boleto) => (
                  <div key={boleto.id} className="rounded-2xl border border-red-200 bg-red-50/80 p-4 dark:border-red-900/40 dark:bg-red-950/20">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{boleto.usuarioNome ?? boleto.moradorNome}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{boleto.descricao} • R$ {(boleto.valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">Vencimento em {formatarDataBR(boleto.dataVencimento)}</p>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => handleEnviarCobranca(boleto)} disabled={sendingCobranca === boleto.id}>
                        {sendingCobranca === boleto.id ? 'Enviando...' : 'Enviar cobrança'}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card gradient>
            <CardHeader>
              <DashboardSectionTitle title="Indicadores rápidos" description="Leitura executiva do condomínio neste momento." />
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Segurança</p>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{visitantesHoje}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Visitantes registrados hoje.</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Financeiro</p>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{boletosVencidosMes}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Boletos vencidos no mês corrente.</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Comunicação</p>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{prioridades.comunicadosImportantes}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Comunicados marcados como importantes.</p>
              </div>
            </CardContent>
          </Card>

          <Card gradient>
            <CardHeader>
              <DashboardSectionTitle title="Comunicados recentes" description="O que foi publicado mais recentemente para os moradores." action={<Link href="/dashboard/sindico/comunicados" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Gerenciar</Link>} />
            </CardHeader>
            <CardContent className="space-y-3">
              {comunicadosRecentes.map((comunicado) => (
                <div key={comunicado.id} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="info" size="sm">{comunicado.categoria || 'Geral'}</Badge>
                        {comunicado.importante ? <Badge variant="danger" size="sm">Importante</Badge> : null}
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{comunicado.titulo}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatarDataBR(comunicado.dataCriacao)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {comunicadosRecentes.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum comunicado recente.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardPage>
  );
}