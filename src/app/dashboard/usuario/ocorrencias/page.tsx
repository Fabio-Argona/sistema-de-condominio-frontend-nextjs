'use client';

import { useEffect, useMemo, useState } from 'react';
import Card, { CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import StatsCard from '@/components/ui/StatsCard';
import EmptyState from '@/components/ui/EmptyState';
import { DashboardHero, DashboardPage, DashboardSectionTitle } from '@/components/layout/RoleDashboard';
import { Ocorrencia, OcorrenciaStatus, OcorrenciaPrioridade } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const statusColors: Record<OcorrenciaStatus, 'success' | 'warning' | 'danger' | 'info'> = { ABERTA: 'danger', EM_ANDAMENTO: 'warning', RESOLVIDA: 'success', FECHADA: 'info' };
const statusLabels: Record<OcorrenciaStatus, string> = { ABERTA: 'Aberta', EM_ANDAMENTO: 'Em Andamento', RESOLVIDA: 'Resolvida', FECHADA: 'Fechada' };

export default function UsuarioOcorrenciasPage() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [manutencaoCondominio, setManutencaoCondominio] = useState<Ocorrencia[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ titulo: '', descricao: '', categoria: '', prioridade: 'MEDIA' as OcorrenciaPrioridade });
  const { user } = useAuth();
  const { get, post, isLoading } = useApi<Ocorrencia[] | Ocorrencia>();

  const loadOcorrencias = async () => {
    if (!user) return;
    const [minhas, todas] = await Promise.all([
      get(`/ocorrencias/usuario/${user.id}`) as Promise<Ocorrencia[]>,
      get('/ocorrencias') as Promise<Ocorrencia[]>,
    ]);
    if (minhas) setOcorrencias(minhas);
    if (todas) {
      const condominio = todas.filter(
        (o) => (o.usuarioId ?? o.moradorId) !== user.id &&
               (o.categoria === 'MANUTENCAO' || o.categoria === 'Manutenção') &&
               (o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO')
      );
      setManutencaoCondominio(condominio);
    }
  };

  useEffect(() => {
    loadOcorrencias();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const created = await post(`/ocorrencias/usuario/${user.id}`, formData) as Ocorrencia;
    if (created) {
      setOcorrencias([created, ...ocorrencias]);
      setIsModalOpen(false);
      setFormData({ titulo: '', descricao: '', categoria: '', prioridade: 'MEDIA' });
      toast.success('Ocorrência registrada com sucesso!');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const resumo = useMemo(() => {
    const abertas = ocorrencias.filter((o) => o.status === 'ABERTA').length;
    const andamento = ocorrencias.filter((o) => o.status === 'EM_ANDAMENTO').length;
    const concluidas = ocorrencias.filter((o) => o.status === 'RESOLVIDA' || o.status === 'FECHADA').length;
    const urgentes = ocorrencias.filter((o) => o.prioridade === 'URGENTE' || o.prioridade === 'ALTA').length;

    return { abertas, andamento, concluidas, urgentes };
  }, [ocorrencias]);

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Ocorrências"
        title="Registre problemas e acompanhe o andamento"
        description="Centralize solicitações do apartamento, veja o que ainda depende de ação e acompanhe serviços coletivos que podem impactar sua rotina."
        status={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={resumo.abertas > 0 ? 'danger' : 'success'} dot>
              {resumo.abertas > 0 ? `${resumo.abertas} ocorrências abertas` : 'Nenhuma ocorrência aberta'}
            </Badge>
            <Badge variant="info">{manutencaoCondominio.length} serviços do condomínio visíveis</Badge>
          </div>
        }
        aside={
          <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Ação rápida</p>
            <div className="mt-4 space-y-3">
              <Button onClick={() => setIsModalOpen(true)} className="w-full" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
                Nova Ocorrência
              </Button>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                Use prioridade alta apenas quando o problema impedir uso, segurança ou acesso essencial.
              </p>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Abertas" value={resumo.abertas} subtitle="Ainda aguardando início" color="red" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm-8.355 2.648h16.71c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L1.913 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
        <StatsCard title="Em andamento" value={resumo.andamento} subtitle="Já atribuídas ou em execução" color="amber" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2.5m5-2.5a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatsCard title="Concluídas" value={resumo.concluidas} subtitle="Histórico já resolvido" color="emerald" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatsCard title="Alta prioridade" value={resumo.urgentes} subtitle="Pedidos com maior impacto" color="indigo" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3c2.755 0 5.26 1.12 7.07 2.93A9.969 9.969 0 0122 13c0 2.28-.762 4.381-2.047 6.063L12 21l-7.953-1.937A9.964 9.964 0 012 13c0-2.755 1.12-5.26 2.93-7.07A9.969 9.969 0 0112 3z" /></svg>} />
      </div>

      <section className="space-y-4">
        <DashboardSectionTitle title="Minhas ocorrências" description="Histórico ordenado pelo que você já abriu e pelo status atual de cada atendimento." />
        <div className="space-y-4">
          {isLoading && ocorrencias.length === 0 ? [...Array(2)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-200 animate-pulse dark:bg-slate-700" />) :
            ocorrencias.length === 0 ? (
              <EmptyState
                title="Nenhuma ocorrência registrada"
                description="Quando surgir um problema no apartamento ou na convivência, ele aparecerá aqui com status e histórico de atualização."
                action={<Button onClick={() => setIsModalOpen(true)}>Registrar primeira ocorrência</Button>}
              />
            ) : ocorrencias.map((o) => (
              <Card key={o.id} gradient hover className="animate-slide-up">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant={statusColors[o.status] || 'info'} dot>{statusLabels[o.status] || o.status}</Badge>
                        <Badge variant={o.prioridade === 'ALTA' || o.prioridade === 'URGENTE' ? 'danger' : o.prioridade === 'MEDIA' ? 'warning' : 'info'}>{o.prioridade}</Badge>
                        <Badge variant="default">{o.categoria}</Badge>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{o.titulo}</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{o.descricao}</p>
                      <p className="mt-3 text-xs text-slate-400">Registrado em: {formatDate(o.dataCriacao)} • Atualizado em: {formatDate(o.dataAtualizacao)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </div>
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Ocorrência">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Título" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} required placeholder="Descreva brevemente o problema" />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Descrição</label>
            <textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} required rows={4} placeholder="Descreva detalhadamente o problema..." className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
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

      {manutencaoCondominio.length > 0 && (
        <section className="space-y-3 animate-slide-up">
          <DashboardSectionTitle title="Serviços em andamento no condomínio" description="Intervenções coletivas abertas que podem afetar circulação, barulho ou uso das áreas." />
          {manutencaoCondominio.map((o) => (
            <Card key={o.id} gradient>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{o.titulo}</p>
                    <p className="mt-1 text-xs text-slate-500">{o.descricao}</p>
                  </div>
                  <Badge variant={statusColors[o.status] || 'info'} dot>{statusLabels[o.status]}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </DashboardPage>
  );
}
