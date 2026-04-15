'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import StatsCard from '@/components/ui/StatsCard';
import { DashboardActions, DashboardHero, DashboardPage, DashboardSectionTitle } from '@/components/layout/RoleDashboard';
import { Boleto, Comunicado, Ocorrencia, Reserva } from '@/types';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';

const statusConfig = {
  ABERTA: { label: 'Aberta', variant: 'danger' as const },
  EM_ANDAMENTO: { label: 'Em andamento', variant: 'warning' as const },
  RESOLVIDA: { label: 'Resolvida', variant: 'success' as const },
  FECHADA: { label: 'Fechada', variant: 'info' as const },
};

const reservaStatusConfig = {
  PENDENTE: { label: 'Pendente', variant: 'warning' as const },
  APROVADA: { label: 'Aprovada', variant: 'success' as const },
  REJEITADA: { label: 'Rejeitada', variant: 'danger' as const },
  CANCELADA: { label: 'Cancelada', variant: 'info' as const },
};

export default function UsuarioDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [minhasOcorrencias, setMinhasOcorrencias] = useState<Ocorrencia[]>([]);
  const [minhasReservas, setMinhasReservas] = useState<Reserva[]>([]);
  const [boletosAbertos, setBoletosAbertos] = useState<Boleto[]>([]);

  const { get, post } = useApi();
  const { user } = useAuth();

  const iniciarDownloadPDF = (pdfBase64: string, descricao: string) => {
    const link = document.createElement('a');
    link.href = pdfBase64;
    link.download = `Boleto_${descricao.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadBoleto = async (boleto: Boleto) => {
    if (!boleto.pdfBase64) {
      window.location.href = '/dashboard/usuario/pagamentos';
      return;
    }

    const result = await post(`/boletos/${boleto.id}/registrar-download`, {}, { showErrorToast: false });
    iniciarDownloadPDF(boleto.pdfBase64, boleto.descricao);

    if (result === null) {
      toast('Download iniciado, mas o histórico não foi registrado.');
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      const dataComunicados = await get('/comunicados') as Comunicado[];
      if (dataComunicados) {
        setComunicados(dataComunicados);
      }
      
      if (user) {
        const [dataOcorrencias, dataReservas, dataBoletos] = await Promise.all([
          get(`/ocorrencias/usuario/${user.id}`) as Promise<Ocorrencia[]>,
          get(`/reservas/usuario/${user.id}`) as Promise<Reserva[]>,
          get(`/boletos/usuario/${user.id}`) as Promise<Boleto[]>,
        ]);

        if (dataOcorrencias) {
          setMinhasOcorrencias(dataOcorrencias);
        }

        if (dataReservas) {
          setMinhasReservas(dataReservas);
        }

        if (dataBoletos && dataBoletos.length > 0) {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);

          const pendentesEVencidos = dataBoletos.filter((b: Boleto) => {
            const status = (b.status || '').toUpperCase().trim();
            const venc = new Date(`${b.dataVencimento}T00:00:00`);

            // Pagos nunca aparecem no dashboard
            if (status === 'PAGO') return false;

            // Vencidos sempre aparecem
            if (status === 'VENCIDO' || venc < hoje) return true;

            // Pendentes só aparecem se vencem em até 30 dias a partir de hoje
            if (status === 'PENDENTE') {
              const diasAteVencimento = Math.floor((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
              return diasAteVencimento <= 30;
            }

            return false;
          });

          pendentesEVencidos.sort((a, b) => new Date(`${a.dataVencimento}T00:00:00`).getTime() - new Date(`${b.dataVencimento}T00:00:00`).getTime());
          setBoletosAbertos(pendentesEVencidos);
        }
      }
    };
    
    loadDashboardData().finally(() => {
        setTimeout(() => setIsLoading(false), 200);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const resumo = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ocorrenciasAbertas = minhasOcorrencias.filter((item) => item.status === 'ABERTA' || item.status === 'EM_ANDAMENTO');
    const reservasAtivas = minhasReservas.filter((item) => item.status === 'APROVADA' || item.status === 'PENDENTE');
    const proximasReservas = [...reservasAtivas]
      .filter((item) => new Date(`${item.dataReserva}T00:00:00`).getTime() >= hoje.getTime())
      .sort((a, b) => new Date(`${a.dataReserva}T00:00:00`).getTime() - new Date(`${b.dataReserva}T00:00:00`).getTime());
    const comunicadosImportantes = comunicados.filter((item) => item.importante).length;
    const boletosVencidos = boletosAbertos.filter((item) => {
      const vencimento = new Date(`${item.dataVencimento}T00:00:00`);
      return (item.status || '').toUpperCase() === 'VENCIDO' || vencimento < hoje;
    });

    return {
      ocorrenciasAbertas,
      reservasAtivas,
      proximasReservas,
      comunicadosImportantes,
      boletosVencidos,
      situacaoFinanceira: boletosVencidos.length > 0 ? 'PENDENTE' : 'EM_DIA',
      proximasEntregas: [
        boletosAbertos[0] ? `Boleto: ${boletosAbertos[0].descricao}` : null,
        proximasReservas[0] ? `Reserva: ${proximasReservas[0].areaComumNome}` : null,
        ocorrenciasAbertas[0] ? `Ocorrência: ${ocorrenciasAbertas[0].titulo}` : null,
      ].filter(Boolean) as string[],
    };
  }, [boletosAbertos, comunicados, minhasOcorrencias, minhasReservas]);

  if (isLoading) {
    return (
      <DashboardPage>
        <div className="space-y-6 animate-pulse">
          <div className="h-40 rounded-[28px] bg-slate-200 dark:bg-slate-800" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800" />)}
          </div>
        </div>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Morador"
        title={`Olá, ${user?.nome?.split(' ')[0] || 'Usuário'}`}
        description="Aqui ficam os alertas que pedem atenção, seus próximos compromissos e o acesso rápido ao que mais importa no condomínio."
        status={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={resumo.situacaoFinanceira === 'EM_DIA' ? 'success' : 'danger'} dot>
              {resumo.situacaoFinanceira === 'EM_DIA' ? 'Situação financeira em dia' : 'Existe pendência financeira'}
            </Badge>
            <Badge variant="info">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</Badge>
          </div>
        }
        aside={
          <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Próximos passos</p>
            <div className="mt-4 space-y-3">
              {resumo.proximasEntregas.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma pendência imediata identificada.</p>
              ) : (
                resumo.proximasEntregas.map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    {item}
                  </div>
                ))
              )}
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Boletos em aberto" value={boletosAbertos.length} color={resumo.boletosVencidos.length > 0 ? 'red' : 'blue'} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>} />
        <StatsCard title="Ocorrências ativas" value={resumo.ocorrenciasAbertas.length} color="amber" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm-8.355 2.648h16.71c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L1.913 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
        <StatsCard title="Reservas em andamento" value={resumo.reservasAtivas.length} color="emerald" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>} />
        <StatsCard title="Comunicados importantes" value={resumo.comunicadosImportantes} color="indigo" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535" /></svg>} />
      </div>

      <DashboardActions
        actions={[
          {
            href: '/dashboard/usuario/pagamentos',
            title: 'Financeiro',
            description: 'Baixe boletos, acompanhe vencimentos e consulte o histórico.',
            accent: 'border-red-200/70 bg-gradient-to-br from-red-50 to-white dark:border-red-900/40 dark:from-red-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>,
          },
          {
            href: '/dashboard/usuario/ocorrencias',
            title: 'Ocorrências',
            description: 'Abra chamados e acompanhe o andamento das solicitações.',
            accent: 'border-amber-200/70 bg-gradient-to-br from-amber-50 to-white dark:border-amber-900/40 dark:from-amber-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm-8.355 2.648h16.71c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L1.913 16c-.77 1.333.192 3 1.732 3z" /></svg>,
          },
          {
            href: '/dashboard/usuario/reservas',
            title: 'Reservas',
            description: 'Veja áreas comuns disponíveis e acompanhe aprovações.',
            accent: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
          },
          {
            href: '/dashboard/usuario/comunicados',
            title: 'Comunicados',
            description: 'Leia os avisos recentes e não perca atualizações relevantes.',
            accent: 'border-sky-200/70 bg-gradient-to-br from-sky-50 to-white dark:border-sky-900/40 dark:from-sky-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535" /></svg>,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card gradient>
          <CardHeader>
            <DashboardSectionTitle title="Fila do morador" description="Itens que merecem acompanhamento agora." action={<Link href="/dashboard/usuario/ocorrencias" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Abrir módulo</Link>} />
          </CardHeader>
          <CardContent className="space-y-3">
            {resumo.ocorrenciasAbertas.slice(0, 3).map((ocorrencia) => (
              <div key={ocorrencia.id} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{ocorrencia.titulo}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ocorrencia.categoria} • {new Date(ocorrencia.dataCriacao || '').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <Badge variant={statusConfig[ocorrencia.status].variant} dot>{statusConfig[ocorrencia.status].label}</Badge>
                </div>
              </div>
            ))}
            {resumo.ocorrenciasAbertas.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">Nenhuma ocorrência ativa no momento.</p>
            )}
            {boletosAbertos.slice(0, 2).map((boleto) => {
              const vencimento = new Date(`${boleto.dataVencimento}T00:00:00`);
              const hoje = new Date();
              hoje.setHours(0, 0, 0, 0);
              const isVencido = (boleto.status || '').toUpperCase() === 'VENCIDO' || vencimento < hoje;

              return (
                <div key={boleto.id} className={`rounded-2xl border p-4 ${isVencido ? 'border-red-200 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/20' : 'border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20'}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{boleto.descricao}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">R$ {boleto.valor.toFixed(2).replace('.', ',')} • Vencimento em {vencimento.toLocaleDateString('pt-BR')}</p>
                    </div>
                    <Button size="sm" variant={isVencido ? 'danger' : 'primary'} onClick={() => handleDownloadBoleto(boleto)}>
                      Baixar boleto
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card gradient>
            <CardHeader>
              <DashboardSectionTitle title="Próximas reservas" description="O que está para acontecer nos próximos dias." action={<Link href="/dashboard/usuario/reservas" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Ver tudo</Link>} />
            </CardHeader>
            <CardContent className="space-y-3">
              {resumo.proximasReservas.slice(0, 4).map((reserva) => (
                <div key={reserva.id} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{reserva.areaComumNome}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{new Date(`${reserva.dataReserva}T00:00:00`).toLocaleDateString('pt-BR')} • {reserva.horaInicio} - {reserva.horaFim}</p>
                    </div>
                    <Badge variant={reservaStatusConfig[reserva.status].variant}>{reservaStatusConfig[reserva.status].label}</Badge>
                  </div>
                </div>
              ))}
              {resumo.proximasReservas.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma reserva próxima encontrada.</p>
              )}
            </CardContent>
          </Card>

          <Card gradient>
            <CardHeader>
              <DashboardSectionTitle title="Comunicados recentes" description="Avisos com impacto direto na rotina do condomínio." action={<Link href="/dashboard/usuario/comunicados" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Ver todos</Link>} />
            </CardHeader>
            <CardContent className="space-y-3">
              {comunicados.slice(0, 4).map((comunicado) => (
                <Link key={comunicado.id} href="/dashboard/usuario/comunicados" className="block rounded-2xl border border-slate-200/80 bg-white/70 p-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        {comunicado.importante ? <Badge variant="danger" size="sm">Importante</Badge> : null}
                        <Badge variant="info" size="sm">{comunicado.categoria}</Badge>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{comunicado.titulo}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{comunicado.conteudo}</p>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(comunicado.dataCriacao).toLocaleDateString('pt-BR')}</span>
                  </div>
                </Link>
              ))}
              {comunicados.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum comunicado recente.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardPage>
  );
}
