'use client';

import { useEffect, useMemo, useState } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import StatsCard from '@/components/ui/StatsCard';
import EmptyState from '@/components/ui/EmptyState';
import { DashboardHero, DashboardPage, DashboardSectionTitle } from '@/components/layout/RoleDashboard';
import { Reserva, AreaComum, ReservaStatus } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const statusColors: Record<ReservaStatus, 'success' | 'warning' | 'danger' | 'info'> = { PENDENTE: 'warning', APROVADA: 'success', REJEITADA: 'danger', CANCELADA: 'info' };
const statusLabels: Record<ReservaStatus, string> = { PENDENTE: 'Pendente', APROVADA: 'Aprovada', REJEITADA: 'Rejeitada', CANCELADA: 'Cancelada' };

export default function UsuarioReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [areas, setAreas] = useState<AreaComum[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [reservaToCancel, setReservaToCancel] = useState<number | null>(null);
  const [formData, setFormData] = useState({ areaComumId: '', dataReserva: '', horaInicio: '', horaFim: '', observacoes: '' });
  
  const { user } = useAuth();
  const { get, post, patch, isLoading } = useApi();

  const loadData = async () => {
    if (!user) return;
    
    const areasData = await get('/areas-comuns') as AreaComum[];
    if (areasData) setAreas(areasData);

    const reservasData = await get(`/reservas/usuario/${user.id}`) as Reserva[];
    if (reservasData) setReservas(reservasData);
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.areaComumId) return;

    if (formData.horaInicio >= formData.horaFim) {
      toast.error('A hora de início deve ser anterior à hora de fim.');
      return;
    }

    const payload = {
      dataReserva: formData.dataReserva,
      horaInicio: formData.horaInicio,
      horaFim: formData.horaFim,
      observacoes: formData.observacoes,
    };

    const created = await post(`/reservas/usuario/${user.id}/area/${formData.areaComumId}`, payload) as Reserva;
    if (created) {
      setReservas([created, ...reservas]);
      setIsModalOpen(false);
      setFormData({ areaComumId: '', dataReserva: '', horaInicio: '', horaFim: '', observacoes: '' });
      toast.success('Reserva solicitada! Aguarde aprovação do síndico.');
    }
  };

  const handleCancelClick = (id: number) => {
    setReservaToCancel(id);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!reservaToCancel) return;
    
    const updated = await patch(`/reservas/${reservaToCancel}/status`, { status: 'CANCELADA' }) as Reserva;
    if (updated) {
      setReservas(reservas.map((r) => r.id === reservaToCancel ? updated : r));
      toast.success('Reserva cancelada com sucesso.');
      setIsCancelModalOpen(false);
      setReservaToCancel(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const dateParts = dateString.split('-');
    if (dateParts.length === 3) {
      return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    }
    return dateString;
  };

  const handleAreaClick = (areaId: number) => {
    setFormData({ ...formData, areaComumId: String(areaId) });
    setIsModalOpen(true);
  };

  const resumo = useMemo(() => {
    const pendentes = reservas.filter((r) => r.status === 'PENDENTE').length;
    const aprovadas = reservas.filter((r) => r.status === 'APROVADA').length;
    const disponiveis = areas.filter((a) => a.disponivel).length;
    const pagas = areas.filter((a) => a.valorReserva > 0).length;

    return { pendentes, aprovadas, disponiveis, pagas };
  }, [reservas, areas]);

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Reservas"
        title="Solicite áreas comuns sem perder o contexto"
        description="Veja rapidamente o que está disponível, o que depende de aprovação e quais reservas já estão confirmadas para organizar melhor o uso das áreas."
        status={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={resumo.pendentes > 0 ? 'warning' : 'success'} dot>
              {resumo.pendentes > 0 ? `${resumo.pendentes} solicitações pendentes` : 'Sem pendências de aprovação'}
            </Badge>
            <Badge variant="info">{resumo.disponiveis} áreas disponíveis agora</Badge>
          </div>
        }
        aside={
          <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Nova solicitação</p>
            <div className="mt-4 space-y-3">
              <Button onClick={() => setIsModalOpen(true)} className="w-full" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
                Nova Reserva
              </Button>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                Solicitações aprovadas ou pendentes ainda podem ser canceladas por você.
              </p>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Pendentes" value={resumo.pendentes} subtitle="Aguardando decisão do síndico" color="amber" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2.5m5-2.5a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatsCard title="Aprovadas" value={resumo.aprovadas} subtitle="Reservas já confirmadas" color="emerald" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatsCard title="Áreas livres" value={resumo.disponiveis} subtitle="Espaços atualmente habilitados" color="blue" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15a1.5 1.5 0 011.5 1.5v10.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 15V4.5A1.5 1.5 0 014.5 3z" /></svg>} />
        <StatsCard title="Áreas pagas" value={resumo.pagas} subtitle="Podem gerar cobrança adicional" color="indigo" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" /></svg>} />
      </div>

      <section className="space-y-4 animate-slide-up">
        <DashboardSectionTitle title="Áreas disponíveis" description="Escolha um espaço para iniciar a solicitação com horário e observações." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {isLoading && areas.length === 0 ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-200 animate-pulse dark:bg-slate-700/50" />)
          ) : areas.length === 0 ? (
            <EmptyState
              title="Nenhuma área comum cadastrada"
              description="As opções de reserva aparecerão aqui assim que o condomínio cadastrar espaços disponíveis para uso."
              className="col-span-1 md:col-span-3"
            />
          ) : areas.map((area) => (
            <Card 
              key={area.id} 
              hover 
              gradient 
              onClick={() => area.disponivel && handleAreaClick(area.id)}
              className={!area.disponivel ? 'cursor-not-allowed opacity-60' : ''}
            >
              <CardContent className="p-5">
                <div className="mb-1 flex items-start justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white">{area.nome}</h3>
                  {!area.disponivel && <Badge variant="danger" size="sm">Indisponível</Badge>}
                </div>
                <p className="mb-3 line-clamp-2 text-xs text-slate-500">{area.descricao}</p>
                <div className="flex justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    {area.horarioAbertura}-{area.horarioFechamento}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                    {area.valorReserva > 0 ? (
                      `R$ ${area.valorReserva}`
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0 1 18 0z" />
                        </svg>
                        Gratuito
                      </>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card gradient className="animate-slide-up">
        <CardHeader><DashboardSectionTitle title="Minhas reservas" description="Acompanhe solicitações, aprovações e cancelamentos do seu histórico." /></CardHeader>
        <CardContent className="p-0">
          {isLoading && reservas.length === 0 ? <div className="animate-pulse space-y-3 p-4">{[...Array(2)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-slate-700/50" />)}</div> :
            reservas.length === 0 ? <div className="p-6"><EmptyState title="Nenhuma reserva encontrada" description="Suas solicitações aprovadas, pendentes ou canceladas ficarão listadas aqui para acompanhamento." /></div> :
            <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
              {reservas.map((r) => (
                <div key={r.id} className="px-6 py-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{r.areaComumNome}</p>
                      <p className="text-xs text-slate-500">{formatDate(r.dataReserva)} • {r.horaInicio} - {r.horaFim}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusColors[r.status] || 'info'} dot>{statusLabels[r.status] || r.status}</Badge>
                      {(r.status === 'PENDENTE' || r.status === 'APROVADA') && (
                        <button disabled={isLoading} onClick={() => handleCancelClick(r.id)} className="text-xs font-medium text-red-500 hover:text-red-400">Cancelar</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Reserva">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Área Comum" name="areaComumId" value={formData.areaComumId} onChange={(e) => setFormData({ ...formData, areaComumId: e.target.value })} options={[{value: '', label: 'Selecione uma área'}, ...areas.filter((a) => a.disponivel).map((a) => ({ value: String(a.id), label: `${a.nome} ${a.valorReserva > 0 ? `(R$ ${a.valorReserva})` : '(Gratuito)'}` }))]} required />
          <Input label="Data da Reserva" type="date" value={formData.dataReserva} onChange={(e) => setFormData({ ...formData, dataReserva: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Hora Início" type="time" value={formData.horaInicio} onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })} required />
            <Input label="Hora Fim" type="time" value={formData.horaFim} onChange={(e) => setFormData({ ...formData, horaFim: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Observações</label>
            <textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={3} placeholder="Observações opcionais..." className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>Solicitar Reserva</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Confirmar Cancelamento">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/20">
            <div className="rounded-lg bg-red-100 p-2 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-200">Deseja realmente cancelar esta reserva?</p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">Esta ação não poderá ser desfeita e a vaga será liberada para outros usuários.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsCancelModalOpen(false)} disabled={isLoading}>Manter Reserva</Button>
            <Button variant="danger" onClick={handleConfirmCancel} isLoading={isLoading}>Sim, Cancelar Reserva</Button>
          </div>
        </div>
      </Modal>
    </DashboardPage>
  );
}
