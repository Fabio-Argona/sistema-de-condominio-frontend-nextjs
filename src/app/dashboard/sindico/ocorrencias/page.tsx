'use client';

import { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import { Ocorrencia, OcorrenciaStatus, OcorrenciaPrioridade } from '@/types';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';

const statusColors: Record<OcorrenciaStatus, 'success' | 'warning' | 'danger' | 'info'> = { ABERTA: 'danger', EM_ANDAMENTO: 'warning', RESOLVIDA: 'success', FECHADA: 'info' };
const statusLabels: Record<OcorrenciaStatus, string> = { ABERTA: 'Aberta', EM_ANDAMENTO: 'Em Andamento', RESOLVIDA: 'Resolvida', FECHADA: 'Fechada' };
const prioridadeColors: Record<OcorrenciaPrioridade, 'danger' | 'warning' | 'info' | 'success'> = { URGENTE: 'danger', ALTA: 'danger', MEDIA: 'warning', BAIXA: 'info' };

export default function OcorrenciasPage() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<Ocorrencia | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusToChange, setStatusToChange] = useState<OcorrenciaStatus | null>(null);
  const [ocorrenciaToChange, setOcorrenciaToChange] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { get, patch, isLoading } = useApi<Ocorrencia[] | Ocorrencia>();

  const loadOcorrencias = async () => {
    const data = await get('/ocorrencias') as Ocorrencia[];
    if (data) setOcorrencias(data);
  };

  useEffect(() => {
    loadOcorrencias();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOcorrencias = ocorrencias.filter((o) => {
    const matchesSearch = o.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (o.moradorNome && o.moradorNome.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !filterStatus || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (id: number, newStatus: OcorrenciaStatus) => {
    // Se for apenas iniciar atendimento, podemos fazer direto p/ experiência ser fluida
    // Mas fechar/resolver são ações definitivas que merecem confirmação
    if (newStatus === 'EM_ANDAMENTO') {
       executeStatusChange(id, newStatus);
       return;
    }
    
    setOcorrenciaToChange(id);
    setStatusToChange(newStatus);
    setIsStatusModalOpen(true);
  };

  const executeStatusChange = async (id: number, newStatus: OcorrenciaStatus) => {
    const updated = await patch(`/ocorrencias/${id}/status`, { status: newStatus }) as Ocorrencia;
    if (updated) {
      setOcorrencias(ocorrencias.map((o) => o.id === id ? updated : o));
      toast.success(`Status atualizado para ${statusLabels[newStatus]}`);
    }
    setIsStatusModalOpen(false);
    setOcorrenciaToChange(null);
    setStatusToChange(null);
  };

  const handleConfirmStatus = () => {
    if (ocorrenciaToChange && statusToChange) {
       executeStatusChange(ocorrenciaToChange, statusToChange);
    }
  };

  const formatDate = (dateString?: string, onlyDate = false) => {
      if (!dateString) return '';
      const opts: Intl.DateTimeFormatOptions = onlyDate ? 
        { day: '2-digit', month: '2-digit', year: 'numeric' } : 
        { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
      return new Date(dateString).toLocaleDateString('pt-BR', opts);
  };

  const columns = [
    {
      key: 'titulo', header: 'Ocorrência',
      render: (o: Ocorrencia) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">{o.titulo}</p>
          <p className="text-xs text-slate-500 mt-0.5">{o.categoria} • {formatDate(o.dataCriacao, true)}</p>
        </div>
      ),
    },
    { key: 'moradorNome', header: 'Morador', render: (o: Ocorrencia) => <span>{o.moradorNome} • Apt {o.apartamento}/{o.bloco}</span> },
    { key: 'prioridade', header: 'Prioridade', render: (o: Ocorrencia) => <Badge variant={prioridadeColors[o.prioridade] || 'info'}>{o.prioridade}</Badge> },
    { key: 'status', header: 'Status', render: (o: Ocorrencia) => <Badge variant={statusColors[o.status] || 'info'} dot>{statusLabels[o.status] || o.status}</Badge> },
    {
      key: 'acoes', header: 'Ações',
      render: (o: Ocorrencia) => (
        <div className="flex items-center gap-2">
          <button onClick={() => { setSelectedOcorrencia(o); setIsDetailOpen(true); }} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Ver detalhes">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          </button>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            {o.status === 'ABERTA' && (
              <button disabled={isLoading} onClick={() => handleStatusChange(o.id, 'EM_ANDAMENTO')} className="px-2 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors border-r border-slate-200 dark:border-slate-700" title="Iniciar atendimento">
                 INICIAR
              </button>
            )}
            {o.status === 'EM_ANDAMENTO' && (
              <button disabled={isLoading} onClick={() => handleStatusChange(o.id, 'RESOLVIDA')} className="px-2 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors border-r border-slate-200 dark:border-slate-700" title="Marcar como resolvida">
                 RESOLVER
              </button>
            )}
            <button disabled={isLoading} onClick={() => handleStatusChange(o.id, 'FECHADA')} className="px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Fechar chamado">
               FECHAR
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-slide-up">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Ocorrências</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie as ocorrências do condomínio</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
        {(['ABERTA', 'EM_ANDAMENTO', 'RESOLVIDA', 'FECHADA'] as OcorrenciaStatus[]).map((status) => (
          <button key={status} onClick={() => setFilterStatus(filterStatus === status ? '' : status)} className={`p-4 rounded-xl border transition-all duration-200 ${filterStatus === status ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            <Badge variant={statusColors[status] || 'info'} dot>{statusLabels[status] || status}</Badge>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{ocorrencias.filter((o) => o.status === status).length}</p>
          </button>
        ))}
      </div>

      <Card className="animate-slide-up">
        <CardHeader>
          <Input placeholder="Buscar por título ou morador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} />
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={columns} data={filteredOcorrencias} isLoading={isLoading && ocorrencias.length === 0} keyExtractor={(o) => o.id} emptyMessage="Nenhuma ocorrência encontrada." />
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Detalhes da Ocorrência" size="lg">
        {selectedOcorrencia && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant={statusColors[selectedOcorrencia.status] || 'info'} dot size="md">{statusLabels[selectedOcorrencia.status] || selectedOcorrencia.status}</Badge>
              <Badge variant={prioridadeColors[selectedOcorrencia.prioridade] || 'info'} size="md">Prioridade: {selectedOcorrencia.prioridade}</Badge>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedOcorrencia.titulo}</h3>
              <p className="text-sm text-slate-500 mt-1">Categoria: {selectedOcorrencia.categoria}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
              <p className="text-sm text-slate-700 dark:text-slate-300">{selectedOcorrencia.descricao}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Morador:</span><p className="font-medium text-slate-900 dark:text-white">{selectedOcorrencia.moradorNome}</p></div>
              <div><span className="text-slate-500">Unidade:</span><p className="font-medium text-slate-900 dark:text-white">Apt {selectedOcorrencia.apartamento} - Bloco {selectedOcorrencia.bloco}</p></div>
              <div><span className="text-slate-500">Registrado em:</span><p className="font-medium text-slate-900 dark:text-white">{formatDate(selectedOcorrencia.dataCriacao)}</p></div>
              <div><span className="text-slate-500">Atualizado em:</span><p className="font-medium text-slate-900 dark:text-white">{formatDate(selectedOcorrencia.dataAtualizacao)}</p></div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
              {selectedOcorrencia.status === 'ABERTA' && <Button variant="outline" onClick={() => { handleStatusChange(selectedOcorrencia.id, 'EM_ANDAMENTO'); setIsDetailOpen(false); }}>Iniciar Atendimento</Button>}
              {selectedOcorrencia.status === 'EM_ANDAMENTO' && <Button onClick={() => { handleStatusChange(selectedOcorrencia.id, 'RESOLVIDA'); setIsDetailOpen(false); }}>Marcar Resolvida</Button>}
              {selectedOcorrencia.status !== 'FECHADA' && <Button onClick={() => { handleStatusChange(selectedOcorrencia.id, 'FECHADA'); setIsDetailOpen(false); }}>Fechar Chamado</Button>}
              <Button variant="ghost" onClick={() => setIsDetailOpen(false)}>Cancelar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
