'use client';

import { useState, useEffect } from 'react';
import Card, { CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { Ocorrencia, OcorrenciaStatus, OcorrenciaPrioridade } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const statusColors: Record<OcorrenciaStatus, 'success' | 'warning' | 'danger' | 'info'> = { ABERTA: 'danger', EM_ANDAMENTO: 'warning', RESOLVIDA: 'success', FECHADA: 'info' };
const statusLabels: Record<OcorrenciaStatus, string> = { ABERTA: 'Aberta', EM_ANDAMENTO: 'Em Andamento', RESOLVIDA: 'Resolvida', FECHADA: 'Fechada' };

export default function MoradorOcorrenciasPage() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ titulo: '', descricao: '', categoria: '', prioridade: 'MEDIA' as OcorrenciaPrioridade });
  const { user } = useAuth();
  const { get, post, isLoading } = useApi<Ocorrencia[] | Ocorrencia>();

  const loadOcorrencias = async () => {
    if (!user) return;
    const data = await get(`/ocorrencias/morador/${user.id}`) as Ocorrencia[];
    if (data) setOcorrencias(data);
  };

  useEffect(() => {
    loadOcorrencias();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      ...formData,
    };

    const created = await post(`/ocorrencias/morador/${user.id}`, payload) as Ocorrencia;
    if (created) {
      setOcorrencias([created, ...ocorrencias]);
      setIsModalOpen(false);
      setFormData({ titulo: '', descricao: '', categoria: '', prioridade: 'MEDIA' });
      toast.success('Ocorrência registrada com sucesso!');
    }
  };

  // Convert LocalDateTime strings safely
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Minhas Ocorrências</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Registre e acompanhe suas ocorrências</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          Nova Ocorrência
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading && ocorrencias.length === 0 ? [...Array(2)].map((_, i) => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />) :
          ocorrencias.length === 0 ? (
            <Card gradient><CardContent className="py-16 text-center"><p className="text-slate-400">Nenhuma ocorrência registrada.</p></CardContent></Card>
          ) : ocorrencias.map((o) => (
            <Card key={o.id} gradient hover className="animate-slide-up">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant={statusColors[o.status] || 'info'} dot>{statusLabels[o.status] || o.status}</Badge>
                      <Badge variant={o.prioridade === 'ALTA' || o.prioridade === 'URGENTE' ? 'danger' : o.prioridade === 'MEDIA' ? 'warning' : 'info'}>{o.prioridade}</Badge>
                      <Badge variant="default">{o.categoria}</Badge>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{o.titulo}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{o.descricao}</p>
                    <p className="text-xs text-slate-400 mt-3">Registrado em: {formatDate(o.dataCriacao)} • Atualizado em: {formatDate(o.dataAtualizacao)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Ocorrência">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Título" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} required placeholder="Descreva brevemente o problema" />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Descrição</label>
            <textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} required rows={4} placeholder="Descreva detalhadamente o problema..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Categoria" name="categoria" value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} options={[{ value: 'Hidráulica', label: 'Hidráulica' }, { value: 'Elétrica', label: 'Elétrica' }, { value: 'Convivência', label: 'Convivência' }, { value: 'Manutenção', label: 'Manutenção' }, { value: 'Segurança', label: 'Segurança' }, { value: 'Outros', label: 'Outros' }]} />
            <Select label="Prioridade" name="prioridade" value={formData.prioridade} onChange={(e) => setFormData({ ...formData, prioridade: e.target.value as OcorrenciaPrioridade })} options={[{ value: 'BAIXA', label: 'Baixa' }, { value: 'MEDIA', label: 'Média' }, { value: 'ALTA', label: 'Alta' }, { value: 'URGENTE', label: 'Urgente' }]} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
