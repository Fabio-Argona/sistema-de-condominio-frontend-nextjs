'use client';

import { useEffect, useState } from 'react';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { Ocorrencia, OcorrenciaStatus } from '@/types';
import toast from 'react-hot-toast';
import { DashboardPage, DashboardHero } from '@/components/layout/RoleDashboard';

const statusColors: Record<OcorrenciaStatus, 'danger' | 'warning' | 'success' | 'info'> = {
  ABERTA: 'danger',
  EM_ANDAMENTO: 'warning',
  RESOLVIDA: 'success',
  FECHADA: 'info',
};

const statusLabels: Record<OcorrenciaStatus, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em andamento',
  RESOLVIDA: 'Resolvida',
  FECHADA: 'Fechada',
};

export default function ManutencaoProfissionalPage() {
  const { user } = useAuth();
  const { get, patch, isLoading } = useApi<Ocorrencia[] | Ocorrencia>();
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [selecionada, setSelecionada] = useState<Ocorrencia | null>(null);
  const [novoStatus, setNovoStatus] = useState<OcorrenciaStatus | ''>('');
  const [tratativa, setTratativa] = useState('');

  const loadOcorrencias = async () => {
    if (!user?.id) {
      return;
    }

    const data = await get(`/ocorrencias/profissional/${user.id}`) as Ocorrencia[];
    if (data) {
      setOcorrencias(data);
    }
  };

  useEffect(() => {
    loadOcorrencias();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const salvarStatus = async () => {
    if (!selecionada || !novoStatus) {
      return;
    }

    const updated = await patch(`/ocorrencias/${selecionada.id}/status`, {
      status: novoStatus,
      respostasSindico: tratativa.trim() ? [tratativa.trim()] : undefined,
    }) as Ocorrencia;

    if (updated) {
      setOcorrencias(ocorrencias.map((ocorrencia) => ocorrencia.id === updated.id ? updated : ocorrencia));
      setSelecionada(null);
      setNovoStatus('');
      setTratativa('');
      toast.success('Status atualizado com sucesso.');
    }
  };

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Manutenção"
        title="Fila de manutenção"
        description="Atualize o andamento dos chamados que foram encaminhados para você. Registre tratativas para manter o síndico informado sobre cada atendimento."
      />

        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Chamados atribuídos</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {ocorrencias.map((ocorrencia) => (
              <div key={ocorrencia.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{ocorrencia.titulo}</p>
                      <Badge variant={statusColors[ocorrencia.status]} dot>{statusLabels[ocorrencia.status]}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{ocorrencia.descricao}</p>
                    <p className="text-xs text-slate-500 mt-2">{ocorrencia.usuarioNome ?? ocorrencia.moradorNome} • Apt {ocorrencia.apartamento}/{ocorrencia.bloco}</p>
                    <p className="text-xs text-slate-500 mt-1">Categoria: {ocorrencia.categoria}</p>
                  </div>
                  <Button variant="outline" onClick={() => { setSelecionada(ocorrencia); setNovoStatus(ocorrencia.status); setTratativa(''); }}>
                    Atualizar status
                  </Button>
                </div>
              </div>
            ))}

            {!isLoading && ocorrencias.length === 0 && (
              <p className="text-sm text-slate-500">Nenhum chamado atribuído no momento.</p>
            )}
          </CardContent>
        </Card>

        <Modal isOpen={!!selecionada} onClose={() => { setSelecionada(null); setNovoStatus(''); setTratativa(''); }} title="Atualizar atendimento" size="md">
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{selecionada?.titulo}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Registre o andamento para manter o síndico atualizado.</p>
            </div>
            <Select
              label="Novo status"
              value={novoStatus}
              onChange={(e) => setNovoStatus(e.target.value as OcorrenciaStatus)}
              options={[
                { value: 'ABERTA', label: 'Aberta' },
                { value: 'EM_ANDAMENTO', label: 'Em andamento' },
                { value: 'RESOLVIDA', label: 'Resolvida' },
                { value: 'FECHADA', label: 'Fechada' },
              ]}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Atualização</label>
              <textarea
                value={tratativa}
                onChange={(e) => setTratativa(e.target.value)}
                rows={4}
                placeholder="Ex: visita agendada para amanhã às 14h."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => { setSelecionada(null); setNovoStatus(''); setTratativa(''); }} disabled={isLoading}>Cancelar</Button>
              <Button onClick={salvarStatus} isLoading={isLoading} disabled={!novoStatus}>Salvar</Button>
            </div>
          </div>
        </Modal>
    </DashboardPage>
  );
}