'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import StatsCard from '@/components/ui/StatsCard';
import DataTable from '@/components/ui/DataTable';
import { DashboardActions, DashboardHero, DashboardPage, DashboardSectionTitle } from '@/components/layout/RoleDashboard';
import { Visitante } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function PorteiroDashboard() {
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ nome: '', documento: '', telefone: '', apartamento: '', bloco: '', veiculo: '', placaVeiculo: '', observacoes: '' });

  const { get, post, patch, isLoading } = useApi();
  const { user } = useAuth();

  const loadVisitantes = async () => {
    const data = await get('/visitantes') as Visitante[];
    if (data) setVisitantes(data);
  };

  useEffect(() => {
    loadVisitantes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDateOnly = (value?: string) => {
    if (!value) return null;
    const sliced = value.length >= 10 ? value.slice(0, 10) : value;
    return new Date(`${sliced}T00:00:00`);
  };

  const isToday = (value?: string) => {
    const date = getDateOnly(value);
    if (!date || Number.isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  const visitantesPresentes = visitantes.filter((v) => !v.dataSaida);
  const visitantesHoje = visitantes.filter((v) => isToday(v.dataEntrada));
  const saidasHoje = visitantes.filter((v) => v.dataSaida && isToday(v.dataSaida));
  const ultimasMovimentacoes = [...visitantes]
    .sort((a, b) => new Date(b.dataEntrada || '').getTime() - new Date(a.dataEntrada || '').getTime())
    .slice(0, 5);

  const filteredVisitantes = visitantes.filter((v) =>
    (v.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    ((v.usuarioNome ?? v.moradorNome)?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (v.apartamento || '').includes(searchTerm)
  );

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const payload = {
        ...formData,
        porteiroNome: user.nome,
      moradorNome: 'Não Identificado',
      usuarioNome: 'Não Identificado'
    };
    
    const created = await post('/visitantes', payload) as Visitante;
    if (created) {
        setVisitantes([created, ...visitantes]);
        setIsModalOpen(false);
        setFormData({ nome: '', documento: '', telefone: '', apartamento: '', bloco: '', veiculo: '', placaVeiculo: '', observacoes: '' });
        toast.success('Entrada registrada com sucesso!');
    }
  };

  const handleExit = async (id: number) => {
    const updated = await patch(`/visitantes/${id}/saida`, {}) as Visitante;
    if (updated) {
        setVisitantes(visitantes.map((v) => v.id === id ? updated : v));
        toast.success('Saída registrada!');
    }
  };

  const columns = [
    {
      key: 'nome', header: 'Visitante',
      render: (v: Visitante) => (
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ${v.dataSaida ? 'bg-gradient-to-br from-slate-400 to-slate-500' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
            {v.nome ? v.nome.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{v.nome}</p>
            <p className="text-xs text-slate-500">{v.documento}</p>
          </div>
        </div>
      ),
    },
    { key: 'destino', header: 'Destino', render: (v: Visitante) => <span>Apt {v.apartamento} - Bloco {v.bloco}</span> },
    { key: 'entrada', header: 'Entrada', render: (v: Visitante) => <span className="text-xs">{v.dataEntrada ? new Date(v.dataEntrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span> },
    { key: 'saida', header: 'Saída', render: (v: Visitante) => v.dataSaida ? <span className="text-xs">{new Date(v.dataSaida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span> : <Badge variant="success" dot size="sm">Presente</Badge> },
    { key: 'veiculo', header: 'Veículo', render: (v: Visitante) => v.veiculo ? <span className="text-xs">{v.veiculo} ({v.placaVeiculo})</span> : <span className="text-xs text-slate-400">—</span> },
    {
      key: 'acoes', header: 'Ações',
      render: (v: Visitante) => !v.dataSaida ? (
        <Button size="sm" variant="outline" onClick={() => handleExit(v.id)} disabled={isLoading}>Registrar Saída</Button>
      ) : <span className="text-xs text-slate-400">Finalizado</span>,
    },
  ];

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Portaria"
        title="Controle de fluxo de visitantes"
        description="Acompanhe quem entrou hoje, quem ainda está no condomínio e resolva rapidamente novas entradas e saídas."
        status={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success" dot>{visitantesPresentes.length} presentes agora</Badge>
            <Badge variant="info">Turno em {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Badge>
          </div>
        }
        aside={
          <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Situação do turno</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">Entradas hoje</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{visitantesHoje.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">Saídas hoje</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{saidasHoje.length}</p>
              </div>
              <Button onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
                Registrar entrada
              </Button>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatsCard title="Entradas hoje" value={visitantesHoje.length} color="blue" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>} />
        <StatsCard title="Presentes agora" value={visitantesPresentes.length} color="emerald" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatsCard title="Saídas registradas" value={saidasHoje.length} color="amber" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>} />
      </div>

      <DashboardActions
        actions={[
          {
            href: '/dashboard/porteiro/visitantes',
            title: 'Fluxo de visitantes',
            description: 'Abra a rotina principal da portaria com o histórico de entradas.',
            accent: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
          },
          {
            href: '/dashboard/porteiro/consulta',
            title: 'Consulta rápida',
            description: 'Pesquise moradores e valide destino antes de liberar acesso.',
            accent: 'border-sky-200/70 bg-gradient-to-br from-sky-50 to-white dark:border-sky-900/40 dark:from-sky-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="animate-slide-up">
          <CardHeader>
            <DashboardSectionTitle title="Movimentações recentes" description="Últimos registros do turno." action={<Link href="/dashboard/porteiro/visitantes" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Ver histórico</Link>} />
          </CardHeader>
          <CardContent className="space-y-3">
            {ultimasMovimentacoes.map((visitante) => (
              <div key={visitante.id} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{visitante.nome}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Destino Apt {visitante.apartamento} - Bloco {visitante.bloco}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Entrada {visitante.dataEntrada ? new Date(visitante.dataEntrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                  </div>
                  {visitante.dataSaida ? (
                    <Badge variant="info">Saiu {new Date(visitante.dataSaida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Badge>
                  ) : (
                    <Badge variant="success" dot>Dentro do condomínio</Badge>
                  )}
                </div>
              </div>
            ))}
            {ultimasMovimentacoes.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma movimentação registrada ainda.</p>
            )}
          </CardContent>
        </Card>

      <Card className="animate-slide-up">
        <CardHeader>
          <Input placeholder="Buscar visitante, apto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} />
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={columns} data={filteredVisitantes} isLoading={isLoading && visitantes.length === 0} keyExtractor={(v) => v.id} emptyMessage="Nenhum visitante registrado" />
        </CardContent>
      </Card>

      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Entrada de Visitante" size="lg">
        <form onSubmit={handleEntry} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nome do Visitante" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
            <Input label="Documento (CPF/RG)" value={formData.documento} onChange={(e) => setFormData({ ...formData, documento: e.target.value })} required />
            <Input label="Telefone" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
            <Input label="Apartamento" value={formData.apartamento} onChange={(e) => setFormData({ ...formData, apartamento: e.target.value })} required />
            <Input label="Bloco" value={formData.bloco} onChange={(e) => setFormData({ ...formData, bloco: e.target.value })} required />
            <Input label="Veículo" value={formData.veiculo} onChange={(e) => setFormData({ ...formData, veiculo: e.target.value })} placeholder="Modelo (opcional)" />
            <Input label="Placa" value={formData.placaVeiculo} onChange={(e) => setFormData({ ...formData, placaVeiculo: e.target.value })} placeholder="ABC-1234 (opcional)" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observações</label>
            <textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={2} placeholder="Observações..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>Registrar Entrada</Button>
          </div>
        </form>
      </Modal>
    </DashboardPage>
  );
}
