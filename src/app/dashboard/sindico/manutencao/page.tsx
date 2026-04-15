'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StatsCard from '@/components/ui/StatsCard';
import EmptyState from '@/components/ui/EmptyState';
import { DashboardActions, DashboardHero, DashboardPage, DashboardSectionTitle } from '@/components/layout/RoleDashboard';
import { Fornecedor, FornecedorFormData, Usuario, Ocorrencia, OcorrenciaPrioridade, Reserva } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';

const statusCor: Record<string, 'danger' | 'warning' | 'success' | 'info'> = {
  ABERTA: 'danger',
  EM_ANDAMENTO: 'warning',
  RESOLVIDA: 'success',
  FECHADA: 'info',
};

interface NovoChamadoForm {
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: OcorrenciaPrioridade;
  profissionalResponsavelId: string;
  // vinculo de fornecedor
  fornecedorMode: 'nenhum' | 'existente' | 'novo';
  fornecedorId: string;
  novoFornecedor: FornecedorFormData;
}

const formVazio: NovoChamadoForm = {
  titulo: '',
  descricao: '',
  categoria: 'MANUTENCAO',
  prioridade: 'MEDIA',
  profissionalResponsavelId: '',
  fornecedorMode: 'nenhum',
  fornecedorId: '',
  novoFornecedor: { nome: '', comentario: '', vigencia: '', contato: '', valor: '' },
};

const fornecedorVazio: FornecedorFormData = {
  nome: '',
  comentario: '',
  vigencia: '',
  contato: '',
  valor: '',
};

export default function ManutencaoPage() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalChamado, setModalChamado] = useState(false);
  const [modalFornecedor, setModalFornecedor] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvandoFornecedor, setSalvandoFornecedor] = useState(false);
  const [form, setForm] = useState<NovoChamadoForm>(formVazio);
  const [formFornecedor, setFormFornecedor] = useState<FornecedorFormData>(fornecedorVazio);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [profissionais, setProfissionais] = useState<Usuario[]>([]);
  const { get, post, put, del } = useApi();
  const { user } = useAuth();

  // Carrega fornecedores da API
  const loadFornecedores = useCallback(async () => {
    const data = await get('/fornecedores') as Fornecedor[] | null;
    if (data) setFornecedores(data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfissionais = useCallback(async () => {
    const data = await get('/usuarios') as Usuario[] | null;
    if (data) {
      setProfissionais(data.filter((usuario) => usuario.role === 'MANTENEDOR' && usuario.ativo));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [ocData, reservaData] = await Promise.all([
          get('/ocorrencias') as Promise<Ocorrencia[]>,
          get('/reservas') as Promise<Reserva[]>,
        ]);

        setOcorrencias(ocData || []);
        setReservas(reservaData || []);
        await loadFornecedores();
        await loadProfissionais();
      } finally {
        setIsLoading(false);
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumo = useMemo(() => {
    const abertas = ocorrencias.filter((o) => o.status === 'ABERTA').length;
    const andamento = ocorrencias.filter((o) => o.status === 'EM_ANDAMENTO').length;
    const concluidas = ocorrencias.filter((o) => o.status === 'RESOLVIDA' || o.status === 'FECHADA').length;
    const urgentes = ocorrencias.filter((o) => o.prioridade === 'ALTA' || o.prioridade === 'URGENTE').length;

    const agenda = reservas
      .filter((r) => ['PENDENTE', 'APROVADA'].includes(r.status))
      .sort((a, b) => new Date(`${a.dataReserva}T00:00:00`).getTime() - new Date(`${b.dataReserva}T00:00:00`).getTime())
      .slice(0, 7);

    return { abertas, andamento, concluidas, urgentes, agenda };
  }, [ocorrencias, reservas]);

  const handleCriarChamado = async () => {
    if (!form.titulo.trim() || !form.descricao.trim()) {
      toast.error('Preencha título e descrição');
      return;
    }
    // Se optou por adicionar novo fornecedor, cadastra antes
    if (form.fornecedorMode === 'novo') {
      if (!form.novoFornecedor.nome.trim()) {
        toast.error('Informe o nome do novo fornecedor');
        return;
      }
      const criado = await post('/fornecedores', form.novoFornecedor) as Fornecedor | null;
      if (criado) setFornecedores((prev) => [...prev, criado]);
    }
    setSalvando(true);
    try {
      const payload = {
        titulo: form.titulo,
        descricao: form.descricao,
        categoria: form.categoria,
        prioridade: form.prioridade,
        profissionalResponsavelId: form.profissionalResponsavelId ? Number(form.profissionalResponsavelId) : undefined,
      };
      const nova = await post(`/ocorrencias/usuario/${user?.id}`, payload, { showSuccessToast: true, successMessage: 'Chamado criado com sucesso!' }) as Ocorrencia | null;
      if (nova) {
        setOcorrencias((prev) => [nova, ...prev]);
        setModalChamado(false);
        setForm(formVazio);
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleAdicionarFornecedor = async () => {
    if (!formFornecedor.nome.trim()) {
      toast.error('Informe o nome do fornecedor');
      return;
    }
    setSalvandoFornecedor(true);
    try {
      const criado = await post('/fornecedores', formFornecedor) as Fornecedor | null;
      if (criado) {
        setFornecedores((prev) => [...prev, criado]);
        setModalFornecedor(false);
        setFormFornecedor(fornecedorVazio);
        toast.success('Fornecedor adicionado');
      }
    } finally {
      setSalvandoFornecedor(false);
    }
  };

  const handleRemoverFornecedor = async (id: number) => {
    await del(`/fornecedores/${id}`, { showSuccessToast: true, successMessage: 'Fornecedor removido' });
    setFornecedores((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAbrirEdicao = (f: Fornecedor) => {
    setFornecedorEditando(f);
    setFormFornecedor({ nome: f.nome, comentario: f.comentario || '', vigencia: f.vigencia || '', contato: f.contato || '', valor: f.valor || '' });
  };

  const handleSalvarEdicao = async () => {
    if (!fornecedorEditando || !formFornecedor.nome.trim()) {
      toast.error('Informe o nome do fornecedor');
      return;
    }
    setSalvandoFornecedor(true);
    try {
      const atualizado = await put(`/fornecedores/${fornecedorEditando.id}`, formFornecedor) as Fornecedor | null;
      if (atualizado) {
        setFornecedores((prev) => prev.map((f) => f.id === atualizado.id ? atualizado : f));
        setFornecedorEditando(null);
        setFormFornecedor(fornecedorVazio);
        toast.success('Fornecedor atualizado');
      }
    } finally {
      setSalvandoFornecedor(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal: Novo Chamado */}
      <Modal isOpen={modalChamado} onClose={() => { setModalChamado(false); setForm(formVazio); }} title="Novo Chamado de Manutenção" size="md">
        <div className="space-y-4 pt-2">
          <Input
            label="Título"
            placeholder="Ex: Vazamento na bomba d'água"
            value={form.titulo}
            onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Descrição</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              rows={3}
              placeholder="Descreva o problema com detalhes..."
              value={form.descricao}
              onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
            />
          </div>
          <Select
            label="Categoria"
            name="categoria"
            value={form.categoria}
            onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
            options={[
              { value: 'MANUTENCAO', label: 'Manutenção' },
              { value: 'LIMPEZA', label: 'Limpeza' },
              { value: 'SEGURANCA', label: 'Segurança' },
              { value: 'BARULHO', label: 'Barulho' },
              { value: 'OUTROS', label: 'Outros' },
            ]}
          />
          <Select
            label="Prioridade"
            name="prioridade"
            value={form.prioridade}
            onChange={(e) => setForm((p) => ({ ...p, prioridade: e.target.value as OcorrenciaPrioridade }))}
            options={[
              { value: 'BAIXA', label: 'Baixa' },
              { value: 'MEDIA', label: 'Média' },
              { value: 'ALTA', label: 'Alta' },
              { value: 'URGENTE', label: 'Urgente' },
            ]}
          />
          <Select
            label="Encaminhar para profissional"
            name="profissionalResponsavelId"
            value={form.profissionalResponsavelId}
            onChange={(e) => setForm((p) => ({ ...p, profissionalResponsavelId: e.target.value }))}
            options={[
              { value: '', label: profissionais.length === 0 ? 'Nenhum profissional disponivel' : 'Selecionar depois' },
              ...profissionais.map((profissional) => ({ value: String(profissional.id), label: profissional.nome })),
            ]}
          />

          {/* Seção de Fornecedor */}
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Fornecedor / Contratado (opcional)</p>
            <div className="flex gap-2 mb-3">
              {(['nenhum', 'existente', 'novo'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, fornecedorMode: mode, fornecedorId: '', novoFornecedor: { nome: '', comentario: '', vigencia: '', contato: '', valor: '' } }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.fornecedorMode === mode
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {mode === 'nenhum' ? 'Nenhum' : mode === 'existente' ? 'Selecionar existente' : 'Adicionar novo'}
                </button>
              ))}
            </div>

            {form.fornecedorMode === 'existente' && (
              fornecedores.length === 0
                ? <p className="text-xs text-slate-500">Nenhum fornecedor cadastrado ainda.</p>
                : <Select
                    label=""
                    name="fornecedorId"
                    value={form.fornecedorId}
                    onChange={(e) => setForm((p) => ({ ...p, fornecedorId: e.target.value }))}
                    options={[
                      { value: '', label: '-- Selecione um fornecedor --' },
                      ...fornecedores.map((f) => ({ value: String(f.id), label: `${f.nome}${f.contato ? ' • ' + f.contato : ''}` })),
                    ]}
                  />
            )}

            {form.fornecedorMode === 'novo' && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Novo Fornecedor</p>
                <Input
                  label="Nome *"
                  placeholder="Ex: Hidráulica Silva"
                  value={form.novoFornecedor.nome}
                  onChange={(e) => setForm((p) => ({ ...p, novoFornecedor: { ...p.novoFornecedor, nome: e.target.value } }))}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">O que faz / Descrição</label>
                  <textarea className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" rows={2} placeholder="Ex: Especialista em hidráulica predial, atende emergencias..." value={form.novoFornecedor.comentario} onChange={(e) => setForm((p) => ({ ...p, novoFornecedor: { ...p.novoFornecedor, comentario: e.target.value } }))} />
                </div>
                <Input
                  label="Vigência do Contrato"
                  placeholder="Ex: 12/2026"
                  value={form.novoFornecedor.vigencia}
                  onChange={(e) => setForm((p) => ({ ...p, novoFornecedor: { ...p.novoFornecedor, vigencia: e.target.value } }))}
                />
                <Input
                  label="Contato"
                  placeholder="Ex: (11) 99999-0000"
                  value={form.novoFornecedor.contato}
                  onChange={(e) => setForm((p) => ({ ...p, novoFornecedor: { ...p.novoFornecedor, contato: e.target.value } }))}
                />
                <Input
                  label="Valor do Contrato"
                  placeholder="Ex: R$ 1.500,00/mês"
                  value={form.novoFornecedor.valor}
                  onChange={(e) => setForm((p) => ({ ...p, novoFornecedor: { ...p.novoFornecedor, valor: e.target.value } }))}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleCriarChamado} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Criar Chamado'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => { setModalChamado(false); setForm(formVazio); }}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Fornecedor (Adicionar / Editar) */}
      <Modal
        isOpen={modalFornecedor || fornecedorEditando !== null}
        onClose={() => { setModalFornecedor(false); setFornecedorEditando(null); setFormFornecedor(fornecedorVazio); }}
        title={fornecedorEditando ? 'Editar Fornecedor' : 'Adicionar Fornecedor'}
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Nome do Fornecedor *"
            placeholder="Ex: Elevadores Atlas"
            value={formFornecedor.nome}
            onChange={(e) => setFormFornecedor((p) => ({ ...p, nome: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">O que faz / Descrição</label>
            <textarea className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" rows={3} placeholder="Ex: Empresa especializada em elevação predial, manutenção preventiva e corretiva..." value={formFornecedor.comentario} onChange={(e) => setFormFornecedor((p) => ({ ...p, comentario: e.target.value }))} />
          </div>
          <Input
            label="Vigência do Contrato"
            placeholder="Ex: 12/2026"
            value={formFornecedor.vigencia}
            onChange={(e) => setFormFornecedor((p) => ({ ...p, vigencia: e.target.value }))}
          />
          <Input
            label="Contato"
            placeholder="Ex: (11) 99999-0000"
            value={formFornecedor.contato}
            onChange={(e) => setFormFornecedor((p) => ({ ...p, contato: e.target.value }))}
          />
          <Input
            label="Valor do Contrato"
            placeholder="Ex: R$ 1.500,00/mês"
            value={formFornecedor.valor}
            onChange={(e) => setFormFornecedor((p) => ({ ...p, valor: e.target.value }))}
          />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={fornecedorEditando ? handleSalvarEdicao : handleAdicionarFornecedor} isLoading={salvandoFornecedor}>
              {fornecedorEditando ? 'Salvar Alterações' : 'Adicionar'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => { setModalFornecedor(false); setFornecedorEditando(null); setFormFornecedor(fornecedorVazio); }}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <DashboardPage>
        <DashboardHero
          eyebrow="Manutenção"
          title="Chamados, fornecedores e agenda técnica no mesmo fluxo"
          description="Acompanhe a fila operacional, identifique o que exige resposta rápida e mantenha próximos compromissos e contratos acessíveis sem trocar de contexto."
          status={
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={resumo.urgentes > 0 ? 'danger' : 'success'} dot>
                {resumo.urgentes > 0 ? `${resumo.urgentes} chamados de alta prioridade` : 'Sem chamados críticos'}
              </Badge>
              <Badge variant="info">{fornecedores.length} fornecedores cadastrados</Badge>
            </div>
          }
          aside={
            <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Ação imediata</p>
              <div className="mt-4 space-y-3">
                <Button onClick={() => setModalChamado(true)} className="w-full">Novo Chamado</Button>
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Encaminhe direto para um mantenedor quando já houver responsável claro para ganhar tempo de resposta.
                </p>
              </div>
            </div>
          }
        />

        <DashboardActions
          actions={[
            {
              href: '/dashboard/sindico/agenda',
              title: 'Agenda técnica',
              description: 'Abra o calendário completo de eventos, manutenções e alertas.',
              accent: 'border-blue-200/70 bg-gradient-to-br from-blue-50 to-white dark:border-blue-900/40 dark:from-blue-950/20 dark:to-slate-900',
              icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 2.25v3m7.5-3v3M3.75 8.25h16.5M4.5 21h15A1.5 1.5 0 0021 19.5v-12A1.5 1.5 0 0019.5 6h-15A1.5 1.5 0 003 7.5v12A1.5 1.5 0 004.5 21z" /></svg>,
            },
            {
              href: '/dashboard/sindico/ocorrencias',
              title: 'Todas as ocorrências',
              description: 'Acesse a lista completa para triagem, filtros e acompanhamento amplo.',
              accent: 'border-amber-200/70 bg-gradient-to-br from-amber-50 to-white dark:border-amber-900/40 dark:from-amber-950/20 dark:to-slate-900',
              icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h10.5" /></svg>,
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Pendentes" value={resumo.abertas} subtitle="Chamados ainda sem início" color="red" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm-8.355 2.648h16.71c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L1.913 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
          <StatsCard title="Em andamento" value={resumo.andamento} subtitle="Intervenções já em execução" color="amber" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2.5m5-2.5a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <StatsCard title="Concluídos" value={resumo.concluidas} subtitle="Histórico já fechado" color="emerald" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <StatsCard title="Fornecedores" value={fornecedores.length} subtitle="Base ativa para contratação" color="indigo" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7.5A2.25 2.25 0 015.25 5.25h13.5A2.25 2.25 0 0121 7.5v9A2.25 2.25 0 0118.75 18.75H5.25A2.25 2.25 0 013 16.5v-9z" /></svg>} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card gradient className="xl:col-span-2">
              <CardHeader>
                <DashboardSectionTitle title="Chamados abertos recentes" description="Fila de atendimento com foco no que ainda exige ação ou acompanhamento." action={<Link href="/dashboard/sindico/ocorrencias" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Ver todos</Link>} />
              </CardHeader>
              <CardContent className="space-y-3">
                {ocorrencias
                  .filter((o) => o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO')
                  .slice(0, 8)
                  .map((o) => (
                    <div key={o.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{o.titulo}</p>
                          <p className="text-xs text-slate-500 mt-1">{o.usuarioNome ?? o.moradorNome} • Apt {o.apartamento}/{o.bloco}</p>
                          {o.profissionalResponsavelNome && (
                            <p className="text-xs text-cyan-600 dark:text-cyan-300 mt-1">Profissional: {o.profissionalResponsavelNome}</p>
                          )}
                        </div>
                        <Badge variant={statusCor[o.status] || 'info'} dot>{o.status.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                  ))}
                {ocorrencias.filter((o) => o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO').length === 0 && (
                  <EmptyState
                    title="Sem chamados abertos"
                    description="A fila operacional está limpa neste momento. Novos chamados aparecerão aqui assim que forem registrados ou encaminhados."
                  />
                )}
              </CardContent>
            </Card>

            <Card gradient>
              <CardHeader>
                <DashboardSectionTitle title="Próximas reservas" description="Uso das áreas que pode impactar equipes, acesso e manutenção preventiva." />
              </CardHeader>
              <CardContent className="space-y-3">
                {resumo.agenda.map((evento) => (
                  <div key={evento.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{evento.areaComumNome}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(`${evento.dataReserva}T00:00:00`).toLocaleDateString('pt-BR')} • {evento.horaInicio} às {evento.horaFim}</p>
                    <p className="text-xs text-slate-500">Responsável: {evento.usuarioNome ?? evento.moradorNome}</p>
                  </div>
                ))}
                {resumo.agenda.length === 0 && <p className="text-sm text-slate-500">Sem reservas pendentes nos próximos dias.</p>}
              </CardContent>
            </Card>
          </div>

          <Card gradient>
            <CardHeader>
              <DashboardSectionTitle title="Fornecedores e contratos" description="Rede de apoio para execução, renovação e contato rápido." action={<Button variant="outline" onClick={() => setModalFornecedor(true)}>+ Adicionar</Button>} />
            </CardHeader>
            <CardContent>
              {fornecedores.length === 0 ? (
                <EmptyState
                  title="Nenhum fornecedor cadastrado"
                  description="Monte aqui a base de apoio para acelerar contratação, contato e renovação dos serviços recorrentes."
                  action={<Button variant="outline" onClick={() => setModalFornecedor(true)}>+ Adicionar</Button>}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {fornecedores.map((fornecedor) => (
                    <div key={fornecedor.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 relative group">
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleAbrirEdicao(fornecedor)}
                          className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                          title="Editar fornecedor"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button
                          onClick={() => handleRemoverFornecedor(fornecedor.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          title="Remover fornecedor"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white pr-16">{fornecedor.nome}</p>
                      {fornecedor.comentario && <p className="text-xs text-slate-500 mt-1 italic line-clamp-2">{fornecedor.comentario}</p>}
                      {fornecedor.vigencia && <p className="text-xs text-slate-500 mt-1">Vigência: {fornecedor.vigencia}</p>}
                      {fornecedor.contato && <p className="text-xs text-slate-500">Contato: {fornecedor.contato}</p>}
                      {fornecedor.valor && <p className="text-sm font-semibold text-emerald-600 mt-2">{fornecedor.valor}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
      </DashboardPage>
    </>
  );
}
