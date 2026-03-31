'use client';

import { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { Reserva, AreaComum, ReservaStatus } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const statusColors: Record<ReservaStatus, 'success' | 'warning' | 'danger' | 'info'> = { PENDENTE: 'warning', APROVADA: 'success', REJEITADA: 'danger', CANCELADA: 'info' };
const statusLabels: Record<ReservaStatus, string> = { PENDENTE: 'Pendente', APROVADA: 'Aprovada', REJEITADA: 'Rejeitada', CANCELADA: 'Cancelada' };

export default function MoradorReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [areas, setAreas] = useState<AreaComum[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ areaComumId: '', dataReserva: '', horaInicio: '', horaFim: '', observacoes: '' });
  
  const { user } = useAuth();
  const { get, post, patch, isLoading } = useApi();

  const loadData = async () => {
    if (!user) return;
    
    // Buscar áreas comuns
    const areasData = await get('/areas-comuns') as AreaComum[];
    if (areasData) setAreas(areasData);

    // Buscar reservas do morador
    const reservasData = await get(`/reservas/morador/${user.id}`) as Reserva[];
    if (reservasData) setReservas(reservasData);
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.areaComumId) return;

    const payload = {
      dataReserva: formData.dataReserva,
      horaInicio: formData.horaInicio,
      horaFim: formData.horaFim,
      observacoes: formData.observacoes
    };

    const created = await post(`/reservas/morador/${user.id}/area/${formData.areaComumId}`, payload) as Reserva;
    if (created) {
      setReservas([created, ...reservas]);
      setIsModalOpen(false);
      setFormData({ areaComumId: '', dataReserva: '', horaInicio: '', horaFim: '', observacoes: '' });
      toast.success('Reserva solicitada! Aguarde aprovação do síndico.');
    }
  };

  const handleCancel = async (id: number) => {
    if (confirm('Deseja realmente cancelar esta reserva?')) {
      const updated = await patch(`/reservas/${id}/status`, { status: 'CANCELADA' }) as Reserva;
      if (updated) {
        setReservas(reservas.map((r) => r.id === id ? updated : r));
        toast.success('Reserva cancelada');
      }
    }
  };

  const formatDate = (dateString?: string) => {
      if (!dateString) return '';
      // dataReserva vem como YYYY-MM-DD do backend (LocalDate formatado)
      // Ajuste de fuso horário local
      const dateParts = dateString.split('-');
      if (dateParts.length === 3) {
          return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      }
      return dateString;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Reservas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Reserve áreas comuns do condomínio</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          Nova Reserva
        </Button>
      </div>

      {/* Areas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up">
        {isLoading && areas.length === 0 ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700/50 animate-pulse rounded-2xl" />)
        ) : areas.length === 0 ? (
            <div className="col-span-1 md:col-span-3 text-center py-8 text-slate-500">Nenhuma área comum cadastrada no condomínio</div>
        ) : areas.map((area) => (
          <Card key={area.id} hover gradient>
            <CardContent className="p-5">
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">{area.nome}</h3>
              <p className="text-xs text-slate-500 mb-3">{area.descricao}</p>
              <div className="flex justify-between text-xs text-slate-400">
                <span>🕐 {area.horarioAbertura}-{area.horarioFechamento}</span>
                <span>{area.valorReserva > 0 ? `R$ ${area.valorReserva}` : '✅ Gratuito'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Minhas Reservas */}
      <Card gradient className="animate-slide-up">
        <CardHeader><h2 className="text-lg font-bold text-slate-900 dark:text-white">Minhas Reservas</h2></CardHeader>
        <CardContent className="p-0">
          {isLoading && reservas.length === 0 ? <div className="animate-pulse p-4 space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700/50 rounded-lg" />)}</div> :
            reservas.length === 0 ? <div className="py-12 text-center text-slate-400">Nenhuma reserva encontrada</div> :
            <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
              {reservas.map((r) => (
                <div key={r.id} className="px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{r.areaComumNome}</p>
                      <p className="text-xs text-slate-500">{formatDate(r.dataReserva)} • {r.horaInicio} - {r.horaFim}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusColors[r.status] || 'info'} dot>{statusLabels[r.status] || r.status}</Badge>
                      {(r.status === 'PENDENTE' || r.status === 'APROVADA') && (
                        <button disabled={isLoading} onClick={() => handleCancel(r.id)} className="text-xs text-red-500 hover:text-red-400 font-medium">Cancelar</button>
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observações</label>
            <textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={3} placeholder="Observações opcionais..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>Solicitar Reserva</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
