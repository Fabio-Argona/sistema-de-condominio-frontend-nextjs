'use client';

import { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import StatsCard from '@/components/ui/StatsCard';
import { Comunicado, Reserva, Ocorrencia, Boleto } from '@/types';
import { useApi } from '@/hooks/useApi';

import { useAuth } from '@/contexts/AuthContext';



const mockReservas: Reserva[] = [
  { id: 1, areaComumId: 1, areaComumNome: 'Salão de Festas', moradorId: 1, moradorNome: 'Eu', apartamento: '302', bloco: 'A', dataReserva: '2026-04-10', horaInicio: '18:00', horaFim: '23:00', status: 'APROVADA', dataCriacao: '2026-03-25T10:00:00' },
];

export default function MoradorDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [minhasOcorrencias, setMinhasOcorrencias] = useState<Ocorrencia[]>([]);
  const [minhasReservas, setMinhasReservas] = useState<Reserva[]>([]);
  const [proximoBoleto, setProximoBoleto] = useState<{ status: string; data: string } | null>(null);
  
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
            if (pendentesEVencidos.length > 0) {
               pendentesEVencidos.sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());
               const maisAntigo = pendentesEVencidos[0];
               
               let strDate = new Date(maisAntigo.dataVencimento + "T00:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
               
               const vencimento = new Date(maisAntigo.dataVencimento + "T00:00:00").getTime();
               const hoje = new Date().setHours(0, 0, 0, 0);

               if (maisAntigo.status === 'VENCIDO' || vencimento < hoje) {
                  setProximoBoleto({ status: 'VENCIDO', data: strDate });
               } else {
                  setProximoBoleto({ status: 'PENDENTE', data: strDate });
               }
            } else {
               setProximoBoleto({ status: 'OK', data: '--' });
            }
         } else {
            setProximoBoleto({ status: 'OK', data: '--' });
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
    <div className="space-y-8">
      <div className="animate-slide-up">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Olá, {user?.nome?.split(' ')[0] || 'Morador'}! 👋</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Bem-vindo ao portal do morador</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
        {proximoBoleto?.status === 'VENCIDO' ? (
           <StatsCard title="Boleto Vencido!" value={proximoBoleto.data} color="red" icon={<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
        ) : proximoBoleto?.status === 'PENDENTE' ? (
           <StatsCard title="Próximo Vencimento" value={proximoBoleto.data} color="amber" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75" /></svg>} />
        ) : (
           <StatsCard title="Situação Financeira" value="Em Dia" color="emerald" icon={<svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        )}
        
        <StatsCard title="Reservas Ativas" value={minhasReservas.filter((r) => r.status === 'APROVADA').length} color="emerald" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatsCard title="Ocorrências Abertas" value={minhasOcorrencias.filter(o => o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO').length} color="blue" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>} />
      </div>

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
                      <p className="text-xs text-slate-400 mt-1">{c.dataCriacao}</p>
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

    </div>
  );
}
