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
import { Fornecedor, FornecedorFormData, Ocorrencia, OcorrenciaPrioridade, Reserva } from '@/types';
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
  const { get, post, put, del, isLoading: apiLoading } = useApi();
  const { user } = useAuth();

  // Carrega fornecedores da API
  const loadFornecedores = useCallback(async () => {
    const data = await get('/fornecedores') as Fornecedor[] | null;
    if (data) setFornecedores(data);
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

    const agenda = reservas
      .filter((r) => ['PENDENTE', 'APROVADA'].includes(r.status))
      .sort((a, b) => new Date(`${a.dataReserva}T00:00:00`).getTime() - new Date(`${b.dataReserva}T00:00:00`).getTime())
      .slice(0, 7);

    return { abertas, andamento, concluidas, agenda };
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
      const payload = { titulo: form.titulo, descricao: form.descricao, categoria: form.categoria, prioridade: form.prioridade };
      const nova = await post(`/ocorrencias/morador/${user?.id}`, payload, { showSuccessToast: true, successMessage: 'Chamado criado com sucesso!' }) as Ocorrencia | null;
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
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
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
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Novo Fornecedor</p>
                <Input
                  label="Nome *"
                  placeholder="Ex: Hidráulica Silva"
                  value={form.novoFornecedor.nome}
                  onChange={(e) => setForm((p) => ({ ...p, novoFornecedor: { ...p.novoFornecedor, nome: e.target.value } }))}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">O que faz / Descrição</label>
                  <textarea className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" rows={2} placeholder="Ex: Especialista em hidráulica predial, atende emergencias..." value={form.novoFornecedor.comentario} onChange={(e) => setForm((p) => ({ ...p, novoFornecedor: { ...p.novoFornecedor, comentario: e.target.value } }))} />
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
            <textarea className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" rows={3} placeholder="Ex: Empresa especializada em elevação predial, manutenção preventiva e corretiva..." value={formFornecedor.comentario} onChange={(e) => setFormFornecedor((p) => ({ ...p, comentario: e.target.value }))} />
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

      <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
        <div className="w-full max-w-6xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-slide-up">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Manutenção e Serviços</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Chamados, agenda preventiva e gestão de fornecedores</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setModalChamado(true)}>Novo Chamado</Button>
              <Link href="/dashboard/sindico/agenda"><Button variant="outline">Agenda Completa</Button></Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Pendentes</p><p className="text-3xl font-bold text-rose-600">{resumo.abertas}</p></CardContent></Card>
            <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Em Andamento</p><p className="text-3xl font-bold text-amber-600">{resumo.andamento}</p></CardContent></Card>
            <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Concluídos</p><p className="text-3xl font-bold text-emerald-600">{resumo.concluidas}</p></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card gradient className="xl:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Chamados Abertos Recentes</h2>
                  <Link href="/dashboard/sindico/ocorrencias" className="text-sm text-blue-500 hover:text-blue-400 font-medium">Ver todos →</Link>
                </div>
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
                          <p className="text-xs text-slate-500 mt-1">{o.moradorNome} • Apt {o.apartamento}/{o.bloco}</p>
                        </div>
                        <Badge variant={statusCor[o.status] || 'info'} dot>{o.status.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                  ))}
                {ocorrencias.filter((o) => o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO').length === 0 && (
                  <p className="text-sm text-slate-500">Sem chamados abertos no momento.</p>
                )}
              </CardContent>
            </Card>

            <Card gradient>
              <CardHeader>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Próximas Reservas</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {resumo.agenda.map((evento) => (
                  <div key={evento.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{evento.areaComumNome}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(`${evento.dataReserva}T00:00:00`).toLocaleDateString('pt-BR')} • {evento.horaInicio} às {evento.horaFim}</p>
                    <p className="text-xs text-slate-500">Responsável: {evento.moradorNome}</p>
                  </div>
                ))}
                {resumo.agenda.length === 0 && <p className="text-sm text-slate-500">Sem reservas pendentes nos próximos dias.</p>}
              </CardContent>
            </Card>
          </div>

          <Card gradient>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fornecedores e Contratos</h2>
                <Button variant="outline" onClick={() => setModalFornecedor(true)}>+ Adicionar</Button>
              </div>
            </CardHeader>
            <CardContent>
              {fornecedores.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum fornecedor cadastrado. Clique em &quot;+ Adicionar&quot; para incluir.</p>
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
        </div>
      </div>
    </>
  );
}
