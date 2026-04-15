'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import StatsCard from '@/components/ui/StatsCard';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Ocorrencia, Reserva, Boleto, Comunicado, Usuario, Visitante } from '@/types';
import { useApi } from '@/hooks/useApi';

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
  EM_ANDAMENTO: 'Em Andamento',
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
      const dateStr = value.length >= 10 ? value.slice(0, 10) : value;
      return new Date(`${dateStr}T00:00:00`);
    };

    const isToday = (value?: string) => {
      const d = toDateOnly(value);
      if (!d || Number.isNaN(d.getTime())) return false;
      const now = new Date();
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
            .filter(o => o.status !== 'RESOLVIDA' && o.status !== 'FECHADA')
            .sort((a, b) => new Date(b.dataCriacao || '').getTime() - new Date(a.dataCriacao || '').getTime())
            .slice(0, 3);
          setOcorrencias(recentes);
          setOcorrenciasAbertas(ocData.filter(o => o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO').length);
        }

        if (resData) {
          const reservasHoje = resData.filter(r => isToday(r.dataReserva));
          setTotalReservasHoje(reservasHoje.length);

          const recentes = [...resData]
            .filter(r => r.status === 'PENDENTE')
            .sort((a, b) => new Date(a.dataReserva || '').getTime() - new Date(b.dataReserva || '').getTime())
            .slice(0, 2);
          setReservasRecentes(recentes);
        }

        if (visData) {
          const visitantesDia = visData.filter(v => isToday(v?.dataEntrada));
          setVisitantesHoje(visitantesDia.length);
        }

        if (morData) {
          const ativos = morData.filter(m => m?.ativo !== false);
          setTotalUsuarios(ativos.length);

          const unidadesUnicas = new Set(
            ativos.map(m => `${m?.bloco || '-'}-${m?.apartamento || '-'}`)
          );
          setTotalUnidades(unidadesUnicas.size);
        }

        if (comunicadosData) {
          const recentes = [...comunicadosData]
            .sort((a, b) => new Date(b.dataCriacao || '').getTime() - new Date(a.dataCriacao || '').getTime())
            .slice(0, 3);
          setComunicadosRecentes(recentes);
        }

        if (boletosData) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const mesAtual = now.getMonth();
          const anoAtual = now.getFullYear();

          const receita = boletosData
            .filter(b => (b.status || '').toUpperCase() === 'PAGO')
            .filter(b => {
              const baseData = b.dataPagamento ? new Date(b.dataPagamento) : new Date(`${b.dataVencimento}T00:00:00`);
              return baseData.getMonth() === mesAtual && baseData.getFullYear() === anoAtual;
            })
            .reduce((total, b) => total + (b.valor || 0), 0);
          setReceitaMensal(receita);

          const baseCobrancas = boletosData.filter(b => {
            const venc = new Date(`${b.dataVencimento}T00:00:00`);
            return venc <= now;
          });
          const pagosBase = baseCobrancas.filter(b => (b.status || '').toUpperCase() === 'PAGO').length;
          const taxa = baseCobrancas.length > 0 ? (pagosBase / baseCobrancas.length) * 100 : 100;
          setTaxaAdimplencia(taxa.toFixed(1));

          const vencidosMes = boletosData.filter(b => {
            const venc = new Date(`${b.dataVencimento}T00:00:00`);
            const status = (b.status || '').toUpperCase();
            const mesmoMes = venc.getMonth() === mesAtual && venc.getFullYear() === anoAtual;
            return mesmoMes && status !== 'PAGO' && venc < now;
          }).length;
          setBoletosVencidosMes(vencidosMes);

          const vencidosTotal = boletosData.filter(b => {
            const venc = new Date(`${b.dataVencimento}T00:00:00`);
            const status = (b.status || '').toUpperCase();
            return status !== 'PAGO' && venc < now;
          });
          setBoletosVencidosTotal(vencidosTotal.length);

          const vencidosList = [...vencidosTotal]
            .sort((a, b) => new Date(`${a.dataVencimento}T00:00:00`).getTime() - new Date(`${b.dataVencimento}T00:00:00`).getTime())
            .slice(0, 5);
          setBoletosVencidos(vencidosList);
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

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen w-full">
      <div className="w-full flex justify-center">
        <div className="w-full max-w-5xl px-4 sm:px-8 py-10 space-y-8 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
          <div className="animate-slide-up">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
              Dashboard do Síndico
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Visão geral do condomínio • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="animate-slide-up stagger-1">
              <StatsCard
                title="Usuários Ativos"
                value={totalUsuarios}
                color="blue"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                }
              />
            </div>
            {totalUnidades > 0 && (
            <div className="animate-slide-up stagger-2">
              <StatsCard
                title="Unidades Cadastradas"
                value={totalUnidades}
                color="indigo"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                }
              />
            </div>
            )}
            {ocorrenciasAbertas > 0 && (
            <div className="animate-slide-up stagger-3">
              <StatsCard
                title="Ocorrências Abertas"
                value={ocorrenciasAbertas}
                color="amber"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                }
              />
            </div>
            )}
            {totalReservasHoje > 0 && (
            <div className="animate-slide-up stagger-4">
              <StatsCard
                title="Reservas de Hoje"
                value={totalReservasHoje}
                color="emerald"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                }
              />
            </div>
            )}
            <div className="animate-slide-up stagger-5">
              <StatsCard
                title="Taxa de Adimplência"
                value={`${taxaAdimplencia}%`}
                color="purple"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                }
              />
            </div>
            {receitaMensal > 0 && (
            <div className="animate-slide-up stagger-6">
              <StatsCard
                title="Receita Condominial (Mês)"
                value={`R$ ${receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                color="indigo"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
            )}
            {visitantesHoje > 0 && (
            <div className="animate-slide-up stagger-7">
              <StatsCard
                title="Visitantes Hoje"
                value={visitantesHoje}
                color="red"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                }
              />
            </div>
            )}
            {boletosVencidosMes > 0 && (
            <div className="animate-slide-up stagger-8">
              <StatsCard
                title="Boletos Vencidos (Mês)"
                value={boletosVencidosMes}
                color="amber"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2.25m0 3.75h.008v.008H12v-.008zM10.29 3.86l-7.2 12.46A2.25 2.25 0 005.04 19.5h13.92a2.25 2.25 0 001.95-3.18l-7.2-12.46a2.25 2.25 0 00-3.42 0z" />
                  </svg>
                }
              />
            </div>
            )}
            {boletosVencidosTotal > 0 && (
            <div className="animate-slide-up stagger-9">
              <StatsCard
                title="Boletos Vencidos (Total)"
                value={boletosVencidosTotal}
                color="red"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                }
              />
            </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card gradient className="animate-slide-up">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Ocorrências Recentes</h2>
                  <Link href="/dashboard/sindico/manutencao" className="text-sm text-blue-500 hover:text-blue-400 transition-colors font-medium">Ver manutenção →</Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
                  {ocorrencias.map((oc) => (
                    <div key={oc.id} className="px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{oc.titulo}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{oc.usuarioNome ?? oc.moradorNome} • Apt {oc.apartamento} Bloco {oc.bloco}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <Badge variant={statusColors[oc.status] || 'info'} dot>{statusLabels[oc.status] || oc.status}</Badge>
                          <Badge variant={prioridadeColors[oc.prioridade] || 'info'} size="sm">{oc.prioridade}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {ocorrencias.length === 0 && (
                    <div className="px-6 py-8 text-center text-slate-400 text-sm">Nenhuma ocorrência aberta</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {reservasRecentes.length > 0 && (
            <Card gradient className="animate-slide-up">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reservas Pendentes</h2>
                  <Link href="/dashboard/sindico/agenda" className="text-sm text-blue-500 hover:text-blue-400 transition-colors font-medium">Ver agenda →</Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
                  {reservasRecentes.map((res) => (
                    <div key={res.id} className="px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{res.areaComumNome}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{res.usuarioNome ?? res.moradorNome} • Apt {res.apartamento} Bloco {res.bloco}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{res.dataReserva} • {res.horaInicio} - {res.horaFim}</p>
                        </div>
                        <Badge variant={statusColors[res.status] || 'info'} dot>{statusLabels[res.status] || res.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            )}
          </div>

          {boletosVencidos.length > 0 && (
          <Card gradient className="animate-slide-up border-red-200 dark:border-red-900/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/40">
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2.25m0 3.75h.008v.008H12v-.008zM10.29 3.86l-7.2 12.46A2.25 2.25 0 005.04 19.5h13.92a2.25 2.25 0 001.95-3.18l-7.2-12.46a2.25 2.25 0 00-3.42 0z" />
                    </svg>
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Boletos Vencidos em Aberto</h2>
                  <Badge variant="danger">{boletosVencidos.length}</Badge>
                </div>
                <Link href="/dashboard/sindico/financeiro" className="text-sm text-blue-500 hover:text-blue-400 transition-colors font-medium">Ver financeiro →</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
                {boletosVencidos.map((b) => (
                  <div key={b.id} className="px-6 py-4 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{b.usuarioNome ?? b.moradorNome}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{b.descricao}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-bold text-red-600 dark:text-red-400">
                            Venceu em {new Date(`${b.dataVencimento}T00:00:00`).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            R$ {(b.valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleEnviarCobranca(b)}
                        disabled={sendingCobranca === b.id}
                      >
                        {sendingCobranca === b.id ? 'Enviando...' : 'Enviar Cobrança'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          )}

          <Card gradient className="animate-slide-up">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Comunicados Recentes</h2>
                <Link href="/dashboard/sindico/comunicados" className="text-sm text-blue-500 hover:text-blue-400 transition-colors font-medium">Ver histórico →</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {comunicadosRecentes.map((comunicado) => (
                <div key={comunicado.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{comunicado.titulo}</p>
                      <p className="text-xs text-slate-500 mt-1">{comunicado.categoria || 'Geral'} • {new Date(comunicado.dataCriacao).toLocaleDateString('pt-BR')}</p>
                    </div>
                    {comunicado.importante && <Badge variant="danger">Importante</Badge>}
                  </div>
                </div>
              ))}
              {comunicadosRecentes.length === 0 && (
                <p className="text-sm text-slate-500">Nenhum comunicado recente.</p>
              )}
            </CardContent>
          </Card>

          <Card gradient className="animate-slide-up">
            <CardHeader>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fluxo de Navegação do Síndico</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Dashboard Inicial', desc: 'Visão geral e decisões rápidas', href: '/dashboard/sindico', color: 'from-blue-500/10 to-indigo-500/10 border-blue-200/30' },
                  { label: 'Gestão Financeira', desc: 'Receita, despesa e inadimplência', href: '/dashboard/sindico/financeiro', color: 'from-emerald-500/10 to-teal-500/10 border-emerald-200/30' },
                  { label: 'Manutenção', desc: 'Chamados e agenda preventiva', href: '/dashboard/sindico/manutencao', color: 'from-amber-500/10 to-orange-500/10 border-amber-200/30' },
                  { label: 'Comunicação', desc: 'Comunicados e enquetes', href: '/dashboard/sindico/comunicados', color: 'from-violet-500/10 to-fuchsia-500/10 border-violet-200/30' },
                ].map((item) => (
                  <Link key={item.label} href={item.href} className={`rounded-2xl border p-4 bg-gradient-to-br ${item.color} hover:scale-[1.01] transition-transform`}>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{item.desc}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 font-medium">Abrir módulo →</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card gradient className="animate-slide-up">
            <CardHeader>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Ações Rápidas</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {([
                  {
                    label: 'Financeiro',
                    href: '/dashboard/sindico/financeiro',
                    icon: (
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    color: 'from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border-emerald-200/30 dark:border-emerald-700/30',
                    iconColor: 'text-emerald-500',
                  },
                  {
                    label: 'Manutenção',
                    href: '/dashboard/sindico/manutencao',
                    icon: (
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 3.506a1.875 1.875 0 012.652 2.652l-3.08 3.08a5.625 5.625 0 01-3.898 9.523 5.625 5.625 0 01-1.815-10.95m8.565-2.54a5.625 5.625 0 017.384 7.383l-2.326 2.326a1.875 1.875 0 01-2.652-2.652l2.326-2.326a1.875 1.875 0 00-2.651-2.652l-2.327 2.327a1.875 1.875 0 11-2.651-2.652l2.326-2.326z" />
                      </svg>
                    ),
                    color: 'from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border-amber-200/30 dark:border-amber-700/30',
                    iconColor: 'text-amber-500',
                  },
                  {
                    label: 'Novo Comunicado',
                    href: '/dashboard/sindico/comunicados',
                    icon: (
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.5c.704 0 1.402.03 2.09.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                      </svg>
                    ),
                    color: 'from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border-emerald-200/30 dark:border-emerald-700/30',
                    iconColor: 'text-emerald-500',
                  },
                  {
                    label: 'Segurança',
                    href: '/dashboard/sindico/seguranca',
                    icon: (
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m6 2.354c0 4.373-3.438 8.354-8.25 9.896C7.938 20.458 4.5 16.477 4.5 12.104V6.75A1.5 1.5 0 016 5.25c1.757 0 3.43-.514 4.852-1.476l.398-.268a1.5 1.5 0 011.7 0l.398.268A8.25 8.25 0 0018 5.25a1.5 1.5 0 011.5 1.5v5.354z" />
                      </svg>
                    ),
                    color: 'from-sky-500/10 to-indigo-500/10 hover:from-sky-500/20 hover:to-indigo-500/20 border-sky-200/30 dark:border-sky-700/30',
                    iconColor: 'text-sky-500',
                  },
                ] as { label: string; href: string; icon: React.ReactNode; color: string; iconColor: string }[]).map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${action.color}`}
                  >
                    <span className={action.iconColor}>{action.icon}</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{action.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
