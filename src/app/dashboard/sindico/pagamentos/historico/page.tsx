'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Boleto } from '@/types';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';

type GroupedHistorico = {
  usuarioId: number;
  usuarioNome: string;
  boletos: Boleto[];
  totalPago: number;
  totalPendente: number;
  totalVencido: number;
};

export default function HistoricoBoletosPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mesFilter, setMesFilter] = useState('');
  const [anoFilter, setAnoFilter] = useState('');
  const [expandedUsuario, setExpandedUsuario] = useState<number | null>(null);
  const [sendingEmail, setSendingEmail] = useState<number | null>(null);

  const { get, post } = useApi();

  useEffect(() => {
    loadBoletos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBoletos = async () => {
    setIsLoading(true);
    try {
      const data = await get('/boletos');
      if (data) setBoletos(data as Boleto[]);
    } catch {
      toast.error('Erro ao carregar histórico de boletos');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PAGO': return 'success';
      case 'PENDENTE': return 'warning';
      case 'VENCIDO': return 'danger';
      default: return 'default';
    }
  };

  const handleReenviarEmail = async (boleto: Boleto) => {
    setSendingEmail(boleto.id);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const venc = new Date(`${boleto.dataVencimento}T00:00:00`);
    const isVencido = venc < hoje && boleto.status !== 'PAGO';

    const endpoint = isVencido
      ? `/boletos/${boleto.id}/enviar-cobranca`
      : `/boletos/${boleto.id}/enviar-email`;

    const result = await post(endpoint, {}, { showErrorToast: false });
    if (result !== null) {
      toast.success(isVencido ? 'E-mail de cobrança reenviado!' : 'Boleto reenviado por e-mail!');
    } else {
      toast.error('Falha ao reenviar e-mail.');
    }
    setSendingEmail(null);
  };

  const mesesOptions = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const anosOptions = useMemo(() => {
    const anos = new Set<string>();
    boletos.forEach((b) => {
      if (b.dataVencimento) {
        anos.add(b.dataVencimento.substring(0, 4));
      }
    });
    return Array.from(anos)
      .sort((a, b) => b.localeCompare(a))
      .map((a) => ({ value: a, label: a }));
  }, [boletos]);

  const grouped = useMemo((): GroupedHistorico[] => {
    const filtered = boletos.filter((b) => {
      const matchStatus = statusFilter === '' || b.status === statusFilter;
      const matchMes =
        mesFilter === '' || (b.dataVencimento && b.dataVencimento.substring(5, 7) === mesFilter);
      const matchAno =
        anoFilter === '' || (b.dataVencimento && b.dataVencimento.substring(0, 4) === anoFilter);
      return matchStatus && matchMes && matchAno;
    });

    const map = new Map<number, GroupedHistorico>();
    filtered.forEach((b) => {
      const usuarioId = b.usuarioId ?? b.moradorId;
      const usuarioNome = b.usuarioNome ?? b.moradorNome || `Usuário #${usuarioId}`;
      if (!map.has(usuarioId)) {
        map.set(usuarioId, {
          usuarioId,
          usuarioNome,
          boletos: [],
          totalPago: 0,
          totalPendente: 0,
          totalVencido: 0,
        });
      }
      const entry = map.get(usuarioId)!;
      entry.boletos.push(b);
      if (b.status === 'PAGO') entry.totalPago += b.valor;
      else if (b.status === 'PENDENTE') entry.totalPendente += b.valor;
      else if (b.status === 'VENCIDO') entry.totalVencido += b.valor;
    });

    return Array.from(map.values())
      .filter((g) =>
        searchTerm === '' ||
        g.usuarioNome.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .sort((a, b) => a.usuarioNome.localeCompare(b.usuarioNome, 'pt-BR'));
  }, [boletos, searchTerm, statusFilter, mesFilter, anoFilter]);

  const totalGeral = useMemo(() => {
    return grouped.reduce(
      (acc, g) => ({
        pago: acc.pago + g.totalPago,
        pendente: acc.pendente + g.totalPendente,
        vencido: acc.vencido + g.totalVencido,
      }),
      { pago: 0, pendente: 0, vencido: 0 },
    );
  }, [grouped]);

  const toggleUsuario = (id: number) => {
    setExpandedUsuario((prev) => (prev === id ? null : id));
  };

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const fmtDate = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR');

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-6xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/dashboard/sindico/pagamentos"
                className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                title="Voltar para Pagamentos"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Histórico de Envio de Boletos
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 ml-7">
              Visualize todos os boletos enviados agrupados por usuário
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadBoletos}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                placeholder="Buscar usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todos os status' },
                  { value: 'PENDENTE', label: 'Pendente' },
                  { value: 'PAGO', label: 'Pago' },
                  { value: 'VENCIDO', label: 'Vencido' },
                ]}
              />
              <Select
                value={mesFilter}
                onChange={(e) => setMesFilter(e.target.value)}
                options={[{ value: '', label: 'Todos os meses' }, ...mesesOptions]}
              />
              <Select
                value={anoFilter}
                onChange={(e) => setAnoFilter(e.target.value)}
                options={[{ value: '', label: 'Todos os anos' }, ...anosOptions]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Resumo geral */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-800/50">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 font-semibold uppercase tracking-wider">Total Pago</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">R$ {fmt(totalGeral.pago)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40">
            <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-800/50">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-amber-700/70 dark:text-amber-400/70 font-semibold uppercase tracking-wider">Total Pendente</p>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-400">R$ {fmt(totalGeral.pendente)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40">
            <div className="p-2.5 rounded-lg bg-red-100 dark:bg-red-800/50">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-red-700/70 dark:text-red-400/70 font-semibold uppercase tracking-wider">Total Vencido</p>
              <p className="text-lg font-bold text-red-700 dark:text-red-400">R$ {fmt(totalGeral.vencido)}</p>
            </div>
          </div>
        </div>

        {/* Lista agrupada por usuário */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-white">
              Boletos por Usuário{' '}
              <span className="text-slate-400 font-normal text-sm">
                ({grouped.length} {grouped.length === 1 ? 'usuário' : 'usuários'})
              </span>
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : grouped.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-12 text-slate-400">
                <svg className="w-14 h-14 text-slate-200 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Nenhum boleto encontrado com os filtros selecionados.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {grouped.map((group) => (
                  <div key={group.usuarioId}>
                    {/* Linha do usuário (clicável para expandir) */}
                    <button
                      onClick={() => toggleUsuario(group.usuarioId)}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Chevron */}
                        <svg
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                            expandedUsuario === group.usuarioId ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                            {group.usuarioNome}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {group.boletos.length} {group.boletos.length === 1 ? 'boleto' : 'boletos'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 ml-7 sm:ml-0">
                        {group.totalPago > 0 && (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
                            Pago: R$ {fmt(group.totalPago)}
                          </span>
                        )}
                        {group.totalPendente > 0 && (
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
                            Pendente: R$ {fmt(group.totalPendente)}
                          </span>
                        )}
                        {group.totalVencido > 0 && (
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">
                            Vencido: R$ {fmt(group.totalVencido)}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Boletos expandidos */}
                    {expandedUsuario === group.usuarioId && (
                      <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                        {/* Cabeçalho da tabela interna — visível apenas em telas maiores */}
                        <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-4 px-8 py-2 text-xs font-bold uppercase text-slate-400 tracking-wider border-b border-slate-100 dark:border-slate-800">
                          <span>Descrição</span>
                          <span>Vencimento</span>
                          <span>Valor</span>
                          <span>Status</span>
                          <span className="text-right">Ação</span>
                        </div>
                        {group.boletos
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(`${b.dataVencimento}T00:00:00`).getTime() -
                              new Date(`${a.dataVencimento}T00:00:00`).getTime(),
                          )
                          .map((boleto) => (
                            <div
                              key={boleto.id}
                              className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 items-center px-8 py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {boleto.descricao}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                <span className="md:hidden text-xs text-slate-400 mr-1">Venc.:</span>
                                {fmtDate(boleto.dataVencimento)}
                              </p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                <span className="md:hidden text-xs text-slate-400 mr-1">Valor:</span>
                                R$ {fmt(boleto.valor)}
                              </p>
                              <div>
                                <Badge variant={getStatusBadgeVariant(boleto.status)} size="sm">
                                  {boleto.status}
                                </Badge>
                                {boleto.status === 'PAGO' && boleto.dataPagamento && (
                                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    em {fmtDate(boleto.dataPagamento)}
                                  </p>
                                )}
                              </div>
                              {/* Botão reenviar e-mail */}
                              <div className="flex justify-end">
                                <button
                                  onClick={() => handleReenviarEmail(boleto)}
                                  disabled={sendingEmail === boleto.id}
                                  title={boleto.status === 'PAGO' ? 'Reenviar boleto por e-mail' : boleto.status === 'VENCIDO' ? 'Reenviar cobrança por e-mail' : 'Enviar boleto por e-mail'}
                                  className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {sendingEmail === boleto.id ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
