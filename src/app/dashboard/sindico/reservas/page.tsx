'use client';

import { useState, useEffect } from 'react';
import Card, { CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
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
  
  const { get, patch, isLoading } = useApi();

  const loadData = async () => {
    const areasData = await get('/areas-comuns') as AreaComum[];
    if (areasData) setAreas(areasData);

    const reservasData = await get('/reservas') as Reserva[];
    if (reservasData) setReservas(reservasData);
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredReservas = reservas.filter((r) => !filterStatus || r.status === filterStatus);

  const handleUpdateStatus = async (id: number, status: ReservaStatus) => {
    const updated = await patch(`/reservas/${id}/status`, { status }) as Reserva;
    if (updated) {
       setReservas(reservas.map((r) => r.id === id ? updated : r));
       if (status === 'APROVADA') toast.success('Reserva aprovada!');
       else if (status === 'REJEITADA') toast.error('Reserva rejeitada!');
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
    <div className="space-y-6">
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
    </div>
  );
}
