'use client';

import { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Comunicado, Reserva, Ocorrencia, Boleto } from '@/types';
import { useApi } from '@/hooks/useApi';

import { useAuth } from '@/contexts/AuthContext';

export default function MoradorDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [minhasOcorrencias, setMinhasOcorrencias] = useState<Ocorrencia[]>([]);
  const [minhasReservas, setMinhasReservas] = useState<Reserva[]>([]);
  const [situacaoFinanceira, setSituacaoFinanceira] = useState<'EM_DIA' | 'PENDENTE' | null>(null);
  const [boletosAbertos, setBoletosAbertos] = useState<Boleto[]>([]);

  const { get } = useApi();
  const { user } = useAuth();

  useEffect(() => {
    const loadDashboardData = async () => {
      const dataComunicados = await get('/comunicados') as Comunicado[];
      if (dataComunicados) {
        setComunicados(dataComunicados.slice(0, 3));
      }
      
      if (user) {
         const dataOcorrencias = await get(`/ocorrencias/morador/${user.id}`) as Ocorrencia[];
         if (dataOcorrencias) {
            setMinhasOcorrencias(dataOcorrencias);
         }
         
         const dataReservas = await get(`/reservas/morador/${user.id}`) as Reserva[];
         if (dataReservas) {
            setMinhasReservas(dataReservas);
         }
         
         const dataBoletos = await get(`/boletos/morador/${user.id}`) as Boleto[];
        if (dataBoletos && dataBoletos.length > 0) {
          const pendentesEVencidos = dataBoletos.filter((b: Boleto) => b.status === 'PENDENTE' || b.status === 'VENCIDO');
          pendentesEVencidos.sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());
          setBoletosAbertos(pendentesEVencidos);
          // Só exibe "pendência" se houver boleto vencido (atrasado)
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const existeVencido = pendentesEVencidos.some(b => {
            const venc = new Date(b.dataVencimento + 'T00:00:00');
            return (b.status === 'VENCIDO' || venc < hoje);
          });
          setSituacaoFinanceira(existeVencido ? 'PENDENTE' : 'EM_DIA');
        } else {
          setSituacaoFinanceira('EM_DIA');
        }
      }
    };
    
    loadDashboardData().finally(() => {
        setTimeout(() => setIsLoading(false), 200);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (isLoading) {
    return <div className="space-y-6 animate-pulse"><div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" /><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}</div></div>;
  }

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-5xl px-4 sm:px-8 py-10 space-y-8 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
      <div className="animate-slide-up">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Olá, {user?.nome?.split(' ')[0] || 'Morador'}! 👋</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Bem-vindo ao portal do morador</p>
        {situacaoFinanceira === 'EM_DIA' && (
          <div className="flex items-center gap-2 mt-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-sm font-semibold text-emerald-500">Sua situação financeira está em dia</span>
          </div>
        )}
        {situacaoFinanceira === 'PENDENTE' && (
          <div className="flex items-center gap-2 mt-2">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span className="text-sm font-semibold text-red-500">Você possui pendência financeira</span>
          </div>
        )}
      </div>

      {/* Boletos pendentes/vencidos */}
      {boletosAbertos.length > 0 && (
        <div className="space-y-3 animate-slide-up">
          {boletosAbertos.map((boleto) => {
            const vencimento = new Date(boleto.dataVencimento + 'T00:00:00');
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const diffMs = hoje.getTime() - vencimento.getTime();
            const diasAtraso = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const isVencido = boleto.status === 'VENCIDO' || diasAtraso > 0;

            return (
              <div
                key={boleto.id}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  isVencido
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isVencido ? (
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  ) : (
                    <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )}
                  <div>
                    <p className={`text-sm font-semibold ${isVencido ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                      {boleto.descricao} — R$ {boleto.valor.toFixed(2).replace('.', ',')}
                    </p>
                    <p className={`text-xs mt-0.5 ${isVencido ? 'text-red-500 dark:text-red-400' : 'text-yellow-500 dark:text-yellow-400'}`}>
                      {isVencido
                        ? `Vencido há ${diasAtraso} dia${diasAtraso !== 1 ? 's' : ''}`
                        : `Vence em ${vencimento.toLocaleDateString('pt-BR')}`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (boleto.pdfBase64) {
                      const link = document.createElement('a');
                      link.href = boleto.pdfBase64;
                      link.download = `Boleto_${boleto.descricao.replace(/\s+/g, '_')}.pdf`;
                      link.click();
                    } else {
                      window.location.href = '/dashboard/morador/pagamentos';
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isVencido
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Baixar Boleto
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Comunicados */}
        <Card gradient className="animate-slide-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Comunicados</h2>
              <a href="/dashboard/morador/comunicados" className="text-sm text-blue-500 hover:text-blue-400 font-medium">Ver todos →</a>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
              {comunicados.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-400 text-sm">Nenhum comunicado recente.</div>
              ) : comunicados.map((c) => (
                <div key={c.id} className="px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors cursor-pointer" onClick={() => window.location.href='/dashboard/morador/comunicados'}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {c.importante && <Badge variant="danger" size="sm">Importante</Badge>}
                        <Badge variant="info" size="sm">{c.categoria}</Badge>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.titulo}</p>
                      <p className="text-xs text-slate-400 mt-1">{c.conteudo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">Por {c.autor}</span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="text-xs text-slate-400">{new Date(c.dataCriacao).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Minhas Ocorrências (substituindo pagamentos por enquanto) */}
        <Card gradient className="animate-slide-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Minhas Ocorrências</h2>
              <a href="/dashboard/morador/ocorrencias" className="text-sm text-blue-500 hover:text-blue-400 font-medium">Ver todas →</a>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
              {minhasOcorrencias.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-400 text-sm">Nenhuma ocorrência sua foi registrada.</div>
              ) : minhasOcorrencias.slice(0, 3).map((o) => (
                <div key={o.id} className="px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{o.titulo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{o.categoria} • {new Date(o.dataCriacao || '').toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <Badge variant={o.status === 'RESOLVIDA' ? 'success' : o.status === 'ABERTA' ? 'danger' : o.status === 'EM_ANDAMENTO' ? 'warning' : 'info'} size="sm" dot>
                         {o.status === 'EM_ANDAMENTO' ? 'Andamento' : o.status.charAt(0).toUpperCase() + o.status.slice(1).toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Minhas Reservas - só aparece se tiver reservas ativas */}
      {minhasReservas.filter(r => r.status === 'APROVADA').length > 0 && (
        <Card gradient className="animate-slide-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Minhas Reservas Ativas</h2>
              <a href="/dashboard/morador/reservas" className="text-sm text-blue-500 hover:text-blue-400 font-medium">Ver todas →</a>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
              {minhasReservas.filter(r => r.status === 'APROVADA').map((r) => (
                <div key={r.id} className="px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.areaComumNome}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{new Date(r.dataReserva + 'T00:00:00').toLocaleDateString('pt-BR')} • {r.horaInicio} - {r.horaFim}</p>
                    </div>
                    <Badge variant="success" size="sm">Aprovada</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      </div>
    </div>
  );
}
