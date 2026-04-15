'use client';

import { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import { Usuario, Ocorrencia, OcorrenciaStatus, OcorrenciaPrioridade } from '@/types';
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
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [statusToChange, setStatusToChange] = useState<OcorrenciaStatus | ''>('');
  const [ocorrenciaToChange, setOcorrenciaToChange] = useState<Ocorrencia | null>(null);
  const [tratativa, setTratativa] = useState('');
  const [profissionais, setProfissionais] = useState<Usuario[]>([]);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { get, patch, isLoading } = useApi<Ocorrencia[] | Ocorrencia>();

  const loadOcorrencias = async () => {
    const data = await get('/ocorrencias') as Ocorrencia[];
    if (data) setOcorrencias(data);
  };

  const loadProfissionais = async () => {
    const data = await get('/usuarios') as Usuario[];
    if (data) {
      setProfissionais(data.filter((usuario) => usuario.role === 'MANTENEDOR' && usuario.ativo));
    }
  };

  useEffect(() => {
    loadOcorrencias();
    loadProfissionais();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOcorrencias = ocorrencias.filter((o) => {
    const matchesSearch = o.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ((o.usuarioNome ?? o.moradorNome) && (o.usuarioNome ?? o.moradorNome)?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !filterStatus || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openStatusModal = (ocorrencia: Ocorrencia, newStatus?: OcorrenciaStatus) => {
    setOcorrenciaToChange(ocorrencia);
    setStatusToChange(newStatus ?? '');
    setTratativa('');
    setIsStatusModalOpen(true);
  };

  const closeStatusModal = () => {
    setIsStatusModalOpen(false);
    setOcorrenciaToChange(null);
    setStatusToChange('');
    setTratativa('');
  };

  const executeStatusChange = async (ocorrencia: Ocorrencia, newStatus: OcorrenciaStatus, descricaoTratativa: string) => {
    const updated = await patch(`/ocorrencias/${ocorrencia.id}/status`, {
      status: newStatus,
      respostasSindico: [descricaoTratativa.trim()],
    }) as Ocorrencia;
    if (updated) {
      setOcorrencias(ocorrencias.map((o) => o.id === ocorrencia.id ? updated : o));
      if (selectedOcorrencia?.id === ocorrencia.id) {
        setSelectedOcorrencia(updated);
      }
      toast.success(`Status atualizado para ${statusLabels[newStatus]}`);
    }
    closeStatusModal();
  };

  const openForwardModal = (ocorrencia: Ocorrencia) => {
    setOcorrenciaToChange(ocorrencia);
    setProfissionalSelecionado(ocorrencia.profissionalResponsavelId ? String(ocorrencia.profissionalResponsavelId) : '');
    setTratativa('');
    setIsForwardModalOpen(true);
  };

  const closeForwardModal = () => {
    setIsForwardModalOpen(false);
    setOcorrenciaToChange(null);
    setProfissionalSelecionado('');
    setTratativa('');
  };

  const handleForwardOccurrence = async () => {
    if (!ocorrenciaToChange || !profissionalSelecionado) {
      toast.error('Selecione um profissional para encaminhar.');
      return;
    }

    const descricaoTratativa = tratativa.trim() || 'Ocorrência encaminhada para o profissional responsável.';
    const updated = await patch(`/ocorrencias/${ocorrenciaToChange.id}/status`, {
      status: ocorrenciaToChange.status,
      profissionalResponsavelId: Number(profissionalSelecionado),
      respostasSindico: [descricaoTratativa],
    }) as Ocorrencia;

    if (updated) {
      setOcorrencias(ocorrencias.map((o) => o.id === ocorrenciaToChange.id ? updated : o));
      if (selectedOcorrencia?.id === ocorrenciaToChange.id) {
        setSelectedOcorrencia(updated);
      }
      toast.success('Ocorrência encaminhada ao profissional.');
      closeForwardModal();
    }
  };

  const handleConfirmStatus = () => {
    if (!ocorrenciaToChange || !statusToChange) {
      return;
    }
    if (tratativa.trim().length < 5) {
      toast.error('Digite uma tratativa com pelo menos 5 caracteres.');
      return;
    }
    executeStatusChange(ocorrenciaToChange, statusToChange, tratativa);
  };

  const statusOptions = (ocorrenciaAtual?: Ocorrencia | null) => [
    { value: 'ABERTA', label: 'Aberta' },
    { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
    { value: 'RESOLVIDA', label: 'Resolvida' },
    { value: 'FECHADA', label: 'Fechada' },
  ].filter((option) => option.value !== ocorrenciaAtual?.status);

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
    { key: 'usuarioNome', header: 'Usuário', render: (o: Ocorrencia) => <span>{o.usuarioNome ?? o.moradorNome} • Apt {o.apartamento}/{o.bloco}</span> },
    {
      key: 'profissional', header: 'Profissional',
      render: (o: Ocorrencia) => o.profissionalResponsavelNome ? (
        <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">{o.profissionalResponsavelNome}</span>
      ) : (
        <span className="text-xs text-slate-400">Nao encaminhada</span>
      ),
    },
    { key: 'prioridade', header: 'Prioridade', render: (o: Ocorrencia) => <Badge variant={prioridadeColors[o.prioridade] || 'info'}>{o.prioridade}</Badge> },
    { key: 'status', header: 'Status', render: (o: Ocorrencia) => <Badge variant={statusColors[o.status] || 'info'} dot>{statusLabels[o.status] || o.status}</Badge> },
    {
      key: 'acoes', header: 'Ações',
      render: (o: Ocorrencia) => (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { setSelectedOcorrencia(o); setIsDetailOpen(true); }} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Ver detalhes">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          </button>
          <div className="flex items-center gap-1">
            {o.status === 'ABERTA' && (
              <button disabled={isLoading} onClick={() => openStatusModal(o, 'EM_ANDAMENTO')} className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors" title="Iniciar atendimento">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
            )}
            {o.status === 'EM_ANDAMENTO' && (
              <button disabled={isLoading} onClick={() => openStatusModal(o, 'RESOLVIDA')} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors" title="Marcar como resolvida">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
            )}
            {o.status !== 'FECHADA' && (
              <button disabled={isLoading} onClick={() => openStatusModal(o, 'FECHADA')} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Fechar chamado">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => openStatusModal(o)}
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M16.586 3.586a2 2 0 112.828 2.828L11.828 14H9v-2.828l7.586-7.586z" /></svg>}
              className="ml-1"
            >
              Alterar status
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isLoading || profissionais.length === 0}
              onClick={() => openForwardModal(o)}
              className="ml-1"
            >
              Encaminhar
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-5xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
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
          <Input placeholder="Buscar por título ou usuário..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} />
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={columns} data={filteredOcorrencias} isLoading={isLoading && ocorrencias.length === 0} keyExtractor={(o) => o.id} emptyMessage="Nenhuma ocorrência encontrada." />
        </CardContent>
      </Card>

      {/* Status Confirmation Modal */}
      <Modal isOpen={isStatusModalOpen} onClose={closeStatusModal} title="Alterar Status da Ocorrência" size="md">
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {ocorrenciaToChange?.titulo}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Status atual: {ocorrenciaToChange ? statusLabels[ocorrenciaToChange.status] : '-'}
            </p>
          </div>
          <Select
            label="Novo status"
            value={statusToChange}
            onChange={(e) => setStatusToChange(e.target.value as OcorrenciaStatus)}
            options={statusOptions(ocorrenciaToChange)}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tratativa</label>
            <textarea
              value={tratativa}
              onChange={(e) => setTratativa(e.target.value)}
              rows={4}
              placeholder="Descreva a ação realizada ou o motivo da alteração de status..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">A tratativa ficará registrada no histórico da ocorrência.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={closeStatusModal} disabled={isLoading}>Cancelar</Button>
            <Button variant="primary" onClick={handleConfirmStatus} isLoading={isLoading} disabled={!statusToChange || tratativa.trim().length < 5}>
              Salvar Alteração
            </Button>
          </div>
        </div>
      </Modal>

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
              <div><span className="text-slate-500">Usuário:</span><p className="font-medium text-slate-900 dark:text-white">{selectedOcorrencia.usuarioNome ?? selectedOcorrencia.moradorNome}</p></div>
              <div><span className="text-slate-500">Unidade:</span><p className="font-medium text-slate-900 dark:text-white">Apt {selectedOcorrencia.apartamento} - Bloco {selectedOcorrencia.bloco}</p></div>
              <div><span className="text-slate-500">Profissional:</span><p className="font-medium text-slate-900 dark:text-white">{selectedOcorrencia.profissionalResponsavelNome || 'Nao encaminhada'}</p></div>
              <div><span className="text-slate-500">Registrado em:</span><p className="font-medium text-slate-900 dark:text-white">{formatDate(selectedOcorrencia.dataCriacao)}</p></div>
              <div><span className="text-slate-500">Atualizado em:</span><p className="font-medium text-slate-900 dark:text-white">{formatDate(selectedOcorrencia.dataAtualizacao)}</p></div>
            </div>
            <div>
              <span className="text-sm text-slate-500">Tratativas do síndico:</span>
              {selectedOcorrencia.respostasSindico && selectedOcorrencia.respostasSindico.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {selectedOcorrencia.respostasSindico.map((resposta, index) => (
                    <div key={`${selectedOcorrencia.id}-resposta-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-700/30 dark:text-slate-300">
                      {resposta}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">Nenhuma tratativa registrada.</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
              {selectedOcorrencia.status === 'ABERTA' && <Button variant="outline" onClick={() => { openStatusModal(selectedOcorrencia, 'EM_ANDAMENTO'); setIsDetailOpen(false); }}>Iniciar Atendimento</Button>}
              {selectedOcorrencia.status === 'EM_ANDAMENTO' && <Button onClick={() => { openStatusModal(selectedOcorrencia, 'RESOLVIDA'); setIsDetailOpen(false); }}>Marcar Resolvida</Button>}
              {selectedOcorrencia.status !== 'FECHADA' && <Button onClick={() => { openStatusModal(selectedOcorrencia, 'FECHADA'); setIsDetailOpen(false); }}>Fechar Chamado</Button>}
              <Button variant="outline" onClick={() => { openForwardModal(selectedOcorrencia); setIsDetailOpen(false); }} disabled={profissionais.length === 0}>Encaminhar</Button>
              <Button variant="secondary" onClick={() => { openStatusModal(selectedOcorrencia); setIsDetailOpen(false); }}>Alterar Status</Button>
              <Button variant="ghost" onClick={() => setIsDetailOpen(false)}>Cancelar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isForwardModalOpen} onClose={closeForwardModal} title="Encaminhar para Profissional" size="md">
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{ocorrenciaToChange?.titulo}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Selecione o profissional que recebera este chamado no painel dele.</p>
          </div>
          <Select
            label="Profissional responsavel"
            value={profissionalSelecionado}
            onChange={(e) => setProfissionalSelecionado(e.target.value)}
            options={[
              { value: '', label: profissionais.length === 0 ? 'Nenhum profissional disponivel' : 'Selecione um profissional' },
              ...profissionais.map((profissional) => ({
                value: String(profissional.id),
                label: profissional.nome,
              })),
            ]}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observacao do encaminhamento</label>
            <textarea
              value={tratativa}
              onChange={(e) => setTratativa(e.target.value)}
              rows={4}
              placeholder="Ex: Favor avaliar urgente a tubulacao do bloco B."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={closeForwardModal} disabled={isLoading}>Cancelar</Button>
            <Button variant="primary" onClick={handleForwardOccurrence} isLoading={isLoading} disabled={!profissionalSelecionado}>
              Encaminhar
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
}
