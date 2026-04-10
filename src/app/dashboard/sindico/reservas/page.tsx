'use client';

import { useState, useEffect } from 'react';
import Card, { CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import DataTable from '@/components/ui/DataTable';
import { Reserva, AreaComum, ReservaStatus } from '@/types';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';

const statusColors: Record<ReservaStatus, 'success' | 'warning' | 'danger' | 'info'> = { PENDENTE: 'warning', APROVADA: 'success', REJEITADA: 'danger', CANCELADA: 'info' };
const statusLabels: Record<ReservaStatus, string> = { PENDENTE: 'Pendente', APROVADA: 'Aprovada', REJEITADA: 'Rejeitada', CANCELADA: 'Cancelada' };

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [areas, setAreas] = useState<AreaComum[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusToChange, setStatusToChange] = useState<ReservaStatus | null>(null);
  const [reservaToChange, setReservaToChange] = useState<number | null>(null);
  
  const { get, patch, isLoading } = useApi();

  const loadData = async () => {
    const areasData = await get('/areas-comuns') as AreaComum[];
    if (areasData) setAreas(areasData);

    const reservasData = await get('/reservas') as Reserva[];
    if (reservasData) {
      // Auto-aprovar reservas PENDENTES cuja data/hora de início é futura
      const now = new Date();
      const pendenteFuturas = reservasData.filter((r: Reserva) => {
        if (r.status !== 'PENDENTE') return false;
        const [year, month, day] = r.dataReserva.split('-').map(Number);
        const [hour, minute] = (r.horaInicio || '00:00').split(':').map(Number);
        const reservaStart = new Date(year, month - 1, day, hour, minute);
        return reservaStart > now;
      });

      if (pendenteFuturas.length > 0) {
        await Promise.all(pendenteFuturas.map((r: Reserva) => patch(`/reservas/${r.id}/status`, { status: 'APROVADA' })));
        const updatedReservas = await get('/reservas') as Reserva[];
        if (updatedReservas) setReservas(updatedReservas as Reserva[]);
      } else {
        setReservas(reservasData);
      }
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredReservas = reservas.filter((r) => !filterStatus || r.status === filterStatus);

  const handleUpdateStatus = (id: number, status: ReservaStatus) => {
    setReservaToChange(id);
    setStatusToChange(status);
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatus = async () => {
    if (!reservaToChange || !statusToChange) return;
    
    const updated = await patch(`/reservas/${reservaToChange}/status`, { status: statusToChange }) as Reserva;
    if (updated) {
       setReservas(reservas.map((r) => r.id === reservaToChange ? updated : r));
       if (statusToChange === 'APROVADA') toast.success('Reserva aprovada com sucesso!');
       else if (statusToChange === 'REJEITADA') toast.error('Reserva rejeitada!');
    }
    setIsStatusModalOpen(false);
    setReservaToChange(null);
    setStatusToChange(null);
  };

  const formatDate = (dateString?: string) => {
      if (!dateString) return '';
      const dateParts = dateString.split('-');
      if (dateParts.length === 3) {
          return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      }
      return dateString;
  };

  const columns = [
    { key: 'areaComumNome', header: 'Área', render: (r: Reserva) => <span className="font-semibold text-slate-900 dark:text-white">{r.areaComumNome}</span> },
    { key: 'moradorNome', header: 'Solicitante', render: (r: Reserva) => <div><p className="font-medium">{r.moradorNome}</p><p className="text-xs text-slate-500">Apt {r.apartamento} - Bloco {r.bloco}</p></div> },
    { key: 'dataReserva', header: 'Data', render: (r: Reserva) => <div><p className="font-medium">{formatDate(r.dataReserva)}</p><p className="text-xs text-slate-500">{r.horaInicio} - {r.horaFim}</p></div> },
    { key: 'status', header: 'Status', render: (r: Reserva) => <Badge variant={statusColors[r.status] || 'info'} dot>{statusLabels[r.status] || r.status}</Badge> },
    {
      key: 'acoes', header: 'Ações',
      render: (r: Reserva) => r.status === 'PENDENTE' ? (
        <div className="flex items-center gap-2">
          <button disabled={isLoading} onClick={() => handleUpdateStatus(r.id, 'APROVADA')} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors" title="Aprovar">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </button>
          <button disabled={isLoading} onClick={() => handleUpdateStatus(r.id, 'REJEITADA')} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Rejeitar">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ) : <span className="text-xs text-slate-400">—</span>,
    },
  ];

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-5xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
      <div className="animate-slide-up">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Reservas</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie as reservas de áreas comuns</p>
      </div>

      {/* Areas Comuns Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide-up">
        {isLoading && areas.length === 0 ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700/50 animate-pulse rounded-2xl" />)
        ) : areas.map((area) => (
          <Card key={area.id} hover gradient>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{area.nome}</h3>
                <Badge variant={area.disponivel ? 'success' : 'danger'} size="sm">{area.disponivel ? 'Disponível' : 'Indisponível'}</Badge>
              </div>
              <p className="text-xs text-slate-500 mb-3">{area.descricao}</p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Cap: {area.capacidade}</span>
                <span>{area.valorReserva > 0 ? `R$ ${area.valorReserva}` : 'Gratuito'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap animate-slide-up">
        <button onClick={() => setFilterStatus('')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!filterStatus ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Todas</button>
        {(['PENDENTE', 'APROVADA', 'REJEITADA', 'CANCELADA'] as ReservaStatus[]).map((s) => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterStatus === s ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{statusLabels[s] || s}</button>
        ))}
      </div>

      <Card className="animate-slide-up">
        <CardContent className="p-0">
          <DataTable columns={columns} data={filteredReservas} isLoading={isLoading && reservas.length === 0} keyExtractor={(r) => r.id} emptyMessage="Nenhuma reserva encontrada" />
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Status */}
      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title={statusToChange === 'APROVADA' ? 'Aprovar Reserva' : 'Rejeitar Reserva'} size="sm">
        <div className="space-y-4">
          <div className={`p-4 rounded-xl flex items-start gap-3 ${
            statusToChange === 'APROVADA'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30'
          }`}>
            <div className={`p-2 rounded-lg shrink-0 ${
              statusToChange === 'APROVADA'
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
            }`}>
              {statusToChange === 'APROVADA' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              )}
            </div>
            <div>
              <p className={`text-sm font-bold ${
                statusToChange === 'APROVADA' ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200'
              }`}>
                {statusToChange === 'APROVADA' ? 'Deseja aprovar esta reserva?' : 'Deseja rejeitar esta reserva?'}
              </p>
              <p className={`text-xs mt-1 ${
                statusToChange === 'APROVADA' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {statusToChange === 'APROVADA'
                  ? 'O morador será notificado da aprovação.'
                  : 'O morador será notificado da rejeição.'}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsStatusModalOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button
              variant={statusToChange === 'APROVADA' ? 'primary' : 'danger'}
              onClick={handleConfirmStatus}
              isLoading={isLoading}
            >
              {statusToChange === 'APROVADA' ? 'Aprovar' : 'Rejeitar'}
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
}
