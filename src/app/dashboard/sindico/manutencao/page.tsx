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
import { Ocorrencia, OcorrenciaPrioridade, Reserva } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';

const statusCor: Record<string, 'danger' | 'warning' | 'success' | 'info'> = {
  ABERTA: 'danger',
  EM_ANDAMENTO: 'warning',
  RESOLVIDA: 'success',
  FECHADA: 'info',
};

const FORNECEDORES_KEY = 'manutencao_fornecedores';

interface Fornecedor {
  id: string;
  nome: string;
  vigencia: string;
  contato: string;
  valor: string;
}

interface NovoChamadoForm {
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: OcorrenciaPrioridade;
}

const formVazio: NovoChamadoForm = {
  titulo: '',
  descricao: '',
  categoria: 'MANUTENCAO',
  prioridade: 'MEDIA',
};

const fornecedorVazio: Omit<Fornecedor, 'id'> = {
  nome: '',
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
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<NovoChamadoForm>(formVazio);
  const [formFornecedor, setFormFornecedor] = useState<Omit<Fornecedor, 'id'>>(fornecedorVazio);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const { get, post } = useApi();
  const { user } = useAuth();

  // Carrega fornecedores do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FORNECEDORES_KEY);
      if (saved) setFornecedores(JSON.parse(saved));
    } catch {
      // ignora erro de parse
    }
  }, []);

  const salvarFornecedores = useCallback((lista: Fornecedor[]) => {
    setFornecedores(lista);
    localStorage.setItem(FORNECEDORES_KEY, JSON.stringify(lista));
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
    setSalvando(true);
    try {
      const nova = await post(`/ocorrencias/morador/${user?.id}`, form, { showSuccessToast: true, successMessage: 'Chamado criado com sucesso!' }) as Ocorrencia | null;
      if (nova) {
        setOcorrencias((prev) => [nova, ...prev]);
        setModalChamado(false);
        setForm(formVazio);
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleAdicionarFornecedor = () => {
    if (!formFornecedor.nome.trim()) {
      toast.error('Informe o nome do fornecedor');
      return;
    }
    const novoFornecedor: Fornecedor = { ...formFornecedor, id: Date.now().toString() };
    salvarFornecedores([...fornecedores, novoFornecedor]);
    setModalFornecedor(false);
    setFormFornecedor(fornecedorVazio);
    toast.success('Fornecedor adicionado');
  };

  const handleRemoverFornecedor = (id: string) => {
    salvarFornecedores(fornecedores.filter((f) => f.id !== id));
    toast.success('Fornecedor removido');
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

      {/* Modal: Novo Fornecedor */}
      <Modal isOpen={modalFornecedor} onClose={() => { setModalFornecedor(false); setFormFornecedor(fornecedorVazio); }} title="Adicionar Fornecedor" size="sm">
        <div className="space-y-4 pt-2">
          <Input
            label="Nome do Fornecedor"
            placeholder="Ex: Elevadores Atlas"
            value={formFornecedor.nome}
            onChange={(e) => setFormFornecedor((p) => ({ ...p, nome: e.target.value }))}
          />
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
            <Button className="flex-1" onClick={handleAdicionarFornecedor}>Adicionar</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setModalFornecedor(false); setFormFornecedor(fornecedorVazio); }}>Cancelar</Button>
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
                      <button
                        onClick={() => handleRemoverFornecedor(fornecedor.id)}
                        className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none"
                        title="Remover fornecedor"
                      >
                        ×
                      </button>
                      <p className="text-sm font-bold text-slate-900 dark:text-white pr-5">{fornecedor.nome}</p>
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
