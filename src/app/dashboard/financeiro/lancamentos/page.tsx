"use client";

import { useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import api from "@/lib/api";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

interface LancamentoFinanceiro {
  id: number;
  data: string;
  descricao: string;
  valor: number;
  tipo: string;
}

export default function ListaLancamentosPage() {
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<string>("");
  const [mesFiltro, setMesFiltro] = useState<string>("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editDescricao, setEditDescricao] = useState("");
  const [editTipo, setEditTipo] = useState("");
  const [busca, setBusca] = useState("");
  const [deletandoId, setDeletandoId] = useState<number | null>(null);
  const [deletandoMes, setDeletandoMes] = useState(false);
  const [lancamentoParaDeletar, setLancamentoParaDeletar] = useState<LancamentoFinanceiro | null>(null);
  const [confirmarDeletarMes, setConfirmarDeletarMes] = useState(false);

  // Paginação
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(20);

  // Role do usuário logado
  const [userRole, setUserRole] = useState<string>("");
  const isSomenteLeitura = userRole === "MORADOR";

  // Carrossel de meses
  const carrosselRef = useRef<HTMLDivElement>(null);
  const mesRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    carregarLancamentos();
  }, []);

  // Decodificar JWT para obter role
  useEffect(() => {
    try {
      const token = Cookies.get("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserRole(payload.role || "");
      }
    } catch {
      // ignora erro de decode
    }
  }, []);

  // Centraliza o mes selecionado no carrossel
  useEffect(() => {
    const key = mesFiltro || "todos";
    const el = mesRefs.current[key];
    const container = carrosselRef.current;
    if (el && container) {
      const containerCenter = container.offsetWidth / 2;
      const elementCenter = el.offsetLeft + el.offsetWidth / 2;
      container.scrollTo({ left: elementCenter - containerCenter, behavior: "smooth" });
    }
  }, [mesFiltro]);

  const carregarLancamentos = () => {
    setLoading(true);
    api
      .get("/financeiro/lancamentos")
      .then((res) => {
        const sorted = [...res.data].sort((a: LancamentoFinanceiro, b: LancamentoFinanceiro) =>
          b.data.localeCompare(a.data)
        );
        setLancamentos(sorted);
        // Seleciona automaticamente o mês mais recente
        const DESCRICOES_EXCLUIR = ["SALDO TOTAL", "SALDO ANTERIOR", "SALDO EM CONTA"];
        const base = sorted.filter(
          (l: LancamentoFinanceiro) => !DESCRICOES_EXCLUIR.some((s) => l.descricao.toUpperCase().includes(s))
        );
        if (base.length > 0) {
          const maisRecente = base[0].data.substring(0, 7);
          setMesFiltro(maisRecente);
        }
      })
      .finally(() => setLoading(false));
  };

  const saldoEntry = lancamentos.find((l) =>
    l.descricao.toUpperCase().includes("SALDO EM CONTA")
  );

  const DESCRICOES_SALDO = ["SALDO TOTAL", "SALDO ANTERIOR", "SALDO EM CONTA"];
  const lancamentosBase = lancamentos.filter(
    (l) => !DESCRICOES_SALDO.some((s) => l.descricao.toUpperCase().includes(s))
  );

  const TERMOS_COBRANCA = ["TAR/CUSTAS COBRANCA", "TAR COBRANCA EXP", "SERV SEM NOME CONTRAPART"];
  const ehCobrancaBancaria = (descricao: string) =>
    TERMOS_COBRANCA.some((t) => descricao.toUpperCase().includes(t.toUpperCase()));

  const totalGastos = lancamentosBase
    .filter((l) => l.tipo === "GASTO")
    .reduce((acc, l) => acc + Number(l.valor), 0);

  const totalReceitas = lancamentosBase
    .filter((l) => l.tipo === "RECEITA")
    .reduce((acc, l) => acc + Number(l.valor), 0);

  const lancamentosFiltrados = lancamentosBase
    .filter((l) => (tipoFiltro ? l.tipo === tipoFiltro : true))
    .filter((l) => (mesFiltro ? l.data.startsWith(mesFiltro) : true))
    .filter((l) => busca ? l.descricao.toLowerCase().includes(busca.toLowerCase()) : true);

  // Paginação
  const totalPaginas = Math.max(1, Math.ceil(lancamentosFiltrados.length / itensPorPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const lancamentosPagina = lancamentosFiltrados.slice(inicio, inicio + itensPorPagina);

  const irParaPagina = (p: number) => setPagina(Math.max(1, Math.min(p, totalPaginas)));

  // Reset paginação ao filtrar
  const handleBusca = (v: string) => { setBusca(v); setPagina(1); };
  const handleTipoFiltro = (v: string) => { setTipoFiltro(v); setPagina(1); };
  const handleMesFiltro = (v: string) => { setMesFiltro(v); setPagina(1); };

  const mesesDisponiveis = Array.from(
    new Set(lancamentosBase.map((l) => l.data.substring(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  const formatMesLabel = (ym: string) => {
    const [ano, mes] = ym.split("-");
    const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${nomes[parseInt(mes) - 1]}/${ano}`;
  };

  const totalFiltradoDespesas = lancamentosFiltrados
    .filter((l) => l.tipo === "GASTO")
    .reduce((acc, l) => acc + Number(l.valor), 0);

  const totalFiltradoReceitas = lancamentosFiltrados
    .filter((l) => l.tipo === "RECEITA")
    .reduce((acc, l) => acc + Number(l.valor), 0);

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [ano, mes, dia] = dateStr.split("-");
    return dia ? `${dia}/${mes}/${ano}` : dateStr;
  };

  const startEdit = (l: LancamentoFinanceiro) => {
    setEditId(l.id);
    setEditDescricao(l.descricao);
    setEditTipo(l.tipo);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditDescricao("");
    setEditTipo("");
  };

  const saveEdit = async (id: number) => {
    try {
      await api.put(`/financeiro/lancamentos/${id}`, { descricao: editDescricao, tipo: editTipo });
      setLancamentos((prev) =>
        prev.map((l) => l.id === id ? { ...l, descricao: editDescricao, tipo: editTipo } : l)
      );
      cancelEdit();
    } catch {
      alert("Erro ao salvar alteração.");
    }
  };

  const handleDelete = async (id: number) => {
    setDeletandoId(id);
    try {
      await api.delete(`/financeiro/lancamentos/${id}`);
      setLancamentos((prev) => prev.filter((l) => l.id !== id));
    } catch {
      alert("Erro ao excluir lançamento.");
    } finally {
      setDeletandoId(null);
      setLancamentoParaDeletar(null);
    }
  };

  const handleDeleteMes = async () => {
    if (!mesFiltro) return;
    const doMes = lancamentosBase.filter((l) => l.data.startsWith(mesFiltro));
    setDeletandoMes(true);
    try {
      await Promise.all(doMes.map((l) => api.delete(`/financeiro/lancamentos/${l.id}`)));
      setLancamentos((prev) => prev.filter((l) => !l.data.startsWith(mesFiltro)));
      setMesFiltro("");
    } catch {
      alert("Erro ao excluir lançamentos do mês.");
    } finally {
      setDeletandoMes(false);
      setConfirmarDeletarMes(false);
    }
  };

  // SVGs reutilizáveis
  const IconEdit = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
  const IconTrash = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
  const IconCheck = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
  const IconX = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
  const IconSpin = () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  const TipoBadge = ({ tipo }: { tipo: string }) => (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${tipo === "RECEITA" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
      {tipo === "RECEITA" ? "Receita" : "Despesa"}
    </span>
  );

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 font-sans text-slate-900">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Lançamentos Financeiros</h1>
        <a
          href="/dashboard/financeiro/importar"
          className="inline-flex items-center justify-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Importar Extrato
        </a>
      </div>

      {/* ── Card Saldo em Conta Corrente ── */}
      {saldoEntry ? (
        <div className="rounded-xl p-4 sm:p-5 border bg-blue-50 border-blue-200 mb-6">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-1 text-blue-600">Saldo em Conta Corrente</p>
          <p className="text-xl sm:text-3xl font-bold text-blue-700">R$ {formatCurrency(Number(saldoEntry.valor))}</p>
          <p className="text-[10px] sm:text-xs text-blue-400 mt-1">Ref: {formatDate(saldoEntry.data)}</p>
        </div>
      ) : (
        <div className="rounded-xl p-4 sm:p-5 border bg-slate-50 border-slate-200 mb-6">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">Saldo em Conta Corrente</p>
          <p className="text-slate-400 text-sm">Nenhum saldo encontrado nos lançamentos importados.</p>
        </div>
      )}

      {/* ── Carrossel de meses ── */}
      {mesesDisponiveis.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Navegar por mês</p>

          {/* Container carrossel */}
          <div
            ref={carrosselRef}
            className="flex gap-1 overflow-x-auto pb-3"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {/* Card "Todos" -- somente SINDICO/admin */}
            {!isSomenteLeitura && (() => {
              const ativo = mesFiltro === "";
              const distancia = mesFiltro === "" ? 0 : Math.min(mesesDisponiveis.length, 3);
              const scale = distancia === 0 ? 1 : distancia === 1 ? 0.9 : 0.8;
              const opacity = distancia === 0 ? 1 : distancia === 1 ? 0.85 : 0.65;
              const totalRecTodos = lancamentosBase.filter((l) => l.tipo === "RECEITA").reduce((acc, l) => acc + Number(l.valor), 0);
              const totalDesTodos = lancamentosBase.filter((l) => l.tipo === "GASTO").reduce((acc, l) => acc + Number(l.valor), 0);
              return (
                <button
                  ref={(el) => { mesRefs.current["todos"] = el; }}
                  onClick={() => handleMesFiltro("")}
                  style={{ transform: `scale(${scale})`, opacity, transformOrigin: "bottom center" }}
                  className={`flex-shrink-0 flex flex-col items-start w-36 px-4 py-4 rounded-2xl border-2 transition-all duration-300 ${
                    ativo
                      ? "bg-slate-800 text-white border-slate-700 shadow-xl"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:shadow-md"
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${ativo ? "text-slate-300" : "text-slate-400"}`}>Todos</span>
                  <div className="flex flex-col gap-1 w-full">
                    <span className={`text-xs font-semibold ${ativo ? "text-green-300" : "text-green-600"}`}>+ R$ {formatCurrency(totalRecTodos)}</span>
                    <span className={`text-xs ${ativo ? "text-red-300" : "text-red-500"}`}>− R$ {formatCurrency(totalDesTodos)}</span>
                  </div>
                </button>
              );
            })()}

            {/* Cards por mês */}
            {mesesDisponiveis.map((ym, idx) => {
              const idxSelecionado = mesesDisponiveis.indexOf(mesFiltro);
              const distancia = mesFiltro === "" ? idx + 1 : Math.abs(idx - idxSelecionado);
              const scale = distancia === 0 ? 1 : distancia === 1 ? 0.9 : distancia === 2 ? 0.82 : 0.75;
              const opacity = distancia === 0 ? 1 : distancia === 1 ? 0.88 : distancia === 2 ? 0.7 : 0.5;
              const ativo = mesFiltro === ym;

              const despMes = lancamentosBase
                .filter((l) => l.data.startsWith(ym) && l.tipo === "GASTO")
                .reduce((acc, l) => acc + Number(l.valor), 0);
              const recMes = lancamentosBase
                .filter((l) => l.data.startsWith(ym) && l.tipo === "RECEITA")
                .reduce((acc, l) => acc + Number(l.valor), 0);

              return (
                <button
                  key={ym}
                  ref={(el) => { mesRefs.current[ym] = el; }}
                  onClick={() => handleMesFiltro(ym)}
                  style={{ transform: `scale(${scale})`, opacity, transformOrigin: "bottom center" }}
                  className={`flex-shrink-0 flex flex-col items-start w-36 px-4 py-4 rounded-2xl border-2 transition-all duration-300 ${
                    ativo
                      ? "bg-blue-600 text-white border-blue-500 shadow-xl"
                      : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:shadow-md"
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${ativo ? "text-blue-200" : "text-slate-400"}`}>
                    {formatMesLabel(ym)}
                  </span>
                  <div className="flex flex-col gap-1 w-full">
                    {recMes > 0 && (
                      <span className={`text-xs font-semibold ${ativo ? "text-green-200" : "text-green-600"}`}>+ R$ {formatCurrency(recMes)}</span>
                    )}
                    {despMes > 0 && (
                      <span className={`text-xs ${ativo ? "text-red-200" : "text-red-500"}`}>− R$ {formatCurrency(despMes)}</span>
                    )}
                    {recMes === 0 && despMes === 0 && (
                      <span className={`text-xs ${ativo ? "text-blue-200" : "text-slate-400"}`}>Sem valores</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-5">
        <input
          type="text"
          placeholder="Buscar descrição..."
          value={busca}
          onChange={(e) => handleBusca(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <select
          value={tipoFiltro}
          onChange={(e) => handleTipoFiltro(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Todos os tipos</option>
          <option value="GASTO">Despesas</option>
          <option value="RECEITA">Receitas</option>
        </select>
        {mesFiltro && !isSomenteLeitura && (
          <button
            onClick={() => setConfirmarDeletarMes(true)}
            disabled={deletandoMes}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deletandoMes ? <IconSpin /> : <IconTrash />}
            Apagar {formatMesLabel(mesFiltro)}
          </button>
        )}
      </div>

      {/* ── Conteúdo ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">Carregando lançamentos...</div>
      ) : lancamentosFiltrados.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
          Nenhum lançamento encontrado.
        </div>
      ) : (
        <>
          {/* ── MOBILE: cards normais (< md) — SINDICO e outros ── */}
          <div className={isSomenteLeitura ? "hidden" : "md:hidden space-y-3"}>
            {lancamentosPagina.map((l) => (
              <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    {editId === l.id ? (
                      <input
                        value={editDescricao}
                        onChange={(e) => setEditDescricao(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    ) : (
                      <p className="text-sm font-medium text-slate-800 leading-snug break-words">{l.descricao}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{formatDate(l.data)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0 mt-0.5">
                    {!isSomenteLeitura && (editId === l.id ? (
                      <>
                        <button onClick={() => saveEdit(l.id)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50" title="Salvar"><IconCheck /></button>
                        <button onClick={cancelEdit} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Cancelar"><IconX /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(l)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50" title="Editar"><IconEdit /></button>
                        <button
                          onClick={() => setLancamentoParaDeletar(l)}
                          disabled={deletandoId === l.id}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                          title="Excluir"
                        >
                          {deletandoId === l.id ? <IconSpin /> : <IconTrash />}
                        </button>
                      </>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {editId === l.id && (
                    <select value={editTipo} onChange={(e) => setEditTipo(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1 text-xs">
                      <option value="RECEITA">Receita</option>
                      <option value="GASTO">Despesa</option>
                    </select>
                  )}
                  <span className={`text-sm font-bold ml-auto ${l.tipo === "GASTO" ? "text-red-500" : "text-green-600"}`}>
                    {l.tipo === "GASTO" ? "−" : "+"} R$ {formatCurrency(Number(l.valor))}
                  </span>
                </div>
              </div>
            ))}
            {/* Totais mobile */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap justify-between gap-2 text-sm font-bold">
              <span className="text-slate-500">p. {paginaAtual}/{totalPaginas} — {lancamentosFiltrados.length} lançamento(s)</span>
              <div className="flex gap-4">
                {totalFiltradoDespesas > 0 && <span className="text-red-600">− R$ {formatCurrency(totalFiltradoDespesas)}</span>}
                {totalFiltradoReceitas > 0 && <span className="text-green-700">+ R$ {formatCurrency(totalFiltradoReceitas)}</span>}
              </div>
            </div>
          </div>

          {/* ── MOBILE COMPACTO: somente MORADOR (< md) ── */}
          <div className={isSomenteLeitura ? "md:hidden" : "hidden"}>
            {/* Título com o mês selecionado */}
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">
              {mesFiltro ? formatMesLabel(mesFiltro) : "Todos os meses"}
            </p>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm divide-y divide-slate-100">
              {lancamentosPagina.map((l) => (
                <div key={l.id} className="flex items-center gap-3 px-3 py-2">
                  {/* Data */}
                  <span className="text-[10px] text-slate-400 whitespace-nowrap w-14 flex-shrink-0">{formatDate(l.data)}</span>
                  {/* Descrição */}
                  <span className="text-xs text-slate-700 flex-1 min-w-0 truncate">{l.descricao}</span>
                  {/* Valor */}
                  <span className={`text-xs font-bold flex-shrink-0 ${l.tipo === "GASTO" ? "text-red-500" : "text-green-600"}`}>
                    {l.tipo === "GASTO" ? "−" : "+"} {formatCurrency(Number(l.valor))}
                  </span>
                </div>
              ))}
            </div>
            {/* Totais compacto */}
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500 px-1">
              <span>{lancamentosFiltrados.length} lançamento(s)</span>
              <div className="flex gap-3">
                {totalFiltradoDespesas > 0 && <span className="text-red-500 font-semibold">− R$ {formatCurrency(totalFiltradoDespesas)}</span>}
                {totalFiltradoReceitas > 0 && <span className="text-green-600 font-semibold">+ R$ {formatCurrency(totalFiltradoReceitas)}</span>}
              </div>
            </div>
          </div>

          {/* ── DESKTOP/TABLET: tabela (>= md) ── */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table className="w-full text-left bg-white min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-400 border-b border-slate-200">
                  <th className="py-3 px-4 whitespace-nowrap">Data</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4 text-right bg-red-50 text-red-400 whitespace-nowrap">Despesa (R$)</th>
                  <th className="py-3 px-4 text-right bg-green-50 text-green-500 whitespace-nowrap">Receita (R$)</th>
                  {!isSomenteLeitura && <th className="py-3 px-4 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {lancamentosPagina.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(l.data)}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {editId === l.id ? (
                        <div className="flex flex-col gap-1">
                          <input
                            value={editDescricao}
                            onChange={(e) => setEditDescricao(e.target.value)}
                            className="border border-slate-300 rounded-lg px-3 py-1 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                          />
                          <select value={editTipo} onChange={(e) => setEditTipo(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1 text-xs w-fit">
                            <option value="RECEITA">Receita</option>
                            <option value="GASTO">Despesa</option>
                          </select>
                        </div>
                      ) : l.descricao}
                    </td>
                    <td className="py-3 px-4 text-right bg-red-50/40 font-semibold text-red-500">
                      {l.tipo === "GASTO" ? `R$ ${formatCurrency(Number(l.valor))}` : ""}
                    </td>
                    <td className="py-3 px-4 text-right bg-green-50/40 font-semibold text-green-600">
                      {l.tipo === "RECEITA" ? `R$ ${formatCurrency(Number(l.valor))}` : ""}
                    </td>
                    {!isSomenteLeitura && (
                      <td className="py-3 px-4 text-center">
                        {editId === l.id ? (
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => saveEdit(l.id)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors" title="Salvar"><IconCheck /></button>
                            <button onClick={cancelEdit} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors" title="Cancelar"><IconX /></button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => startEdit(l)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="Editar"><IconEdit /></button>
                            <button
                              onClick={() => setLancamentoParaDeletar(l)}
                              disabled={deletandoId === l.id}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Excluir"
                            >
                              {deletandoId === l.id ? <IconSpin /> : <IconTrash />}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-sm">
                  <td className="py-3 px-4 text-slate-500" colSpan={3}>
                    Total ({lancamentosFiltrados.length} lançamento{lancamentosFiltrados.length !== 1 ? "s" : ""})
                  </td>
                  <td className="py-3 px-4 text-right bg-red-100 text-red-600">
                    {totalFiltradoDespesas > 0 ? `R$ ${formatCurrency(totalFiltradoDespesas)}` : "—"}
                  </td>
                  <td className="py-3 px-4 text-right bg-green-100 text-green-700">
                    {totalFiltradoReceitas > 0 ? `R$ ${formatCurrency(totalFiltradoReceitas)}` : "—"}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── Controles de Paginação ── */}
          {totalPaginas > 1 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Info + itens por página */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Exibindo {inicio + 1}–{Math.min(inicio + itensPorPagina, lancamentosFiltrados.length)} de {lancamentosFiltrados.length}</span>
                <select
                  value={itensPorPagina}
                  onChange={(e) => { setItensPorPagina(Number(e.target.value)); setPagina(1); }}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} por pág.</option>)}
                </select>
              </div>

              {/* Botões de navegação */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => irParaPagina(1)}
                  disabled={paginaAtual === 1}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  title="Primeira página"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                </button>
                <button
                  onClick={() => irParaPagina(paginaAtual - 1)}
                  disabled={paginaAtual === 1}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  title="Página anterior"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>

                {/* Números de página */}
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - paginaAtual) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 text-sm">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => irParaPagina(p as number)}
                        className={`min-w-[32px] h-8 rounded-lg text-xs font-semibold transition-colors ${
                          paginaAtual === p
                            ? "bg-blue-600 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() => irParaPagina(paginaAtual + 1)}
                  disabled={paginaAtual === totalPaginas}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  title="Próxima página"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button
                  onClick={() => irParaPagina(totalPaginas)}
                  disabled={paginaAtual === totalPaginas}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  title="Última página"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: confirmar excluir lancamento */}
      <Modal isOpen={!!lancamentoParaDeletar} onClose={() => setLancamentoParaDeletar(null)} title="Excluir Lancamento" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-600 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-200">Deseja excluir este lancamento?</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 break-words">{lancamentoParaDeletar?.descricao}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="ghost" onClick={() => setLancamentoParaDeletar(null)} disabled={!!deletandoId}>Cancelar</Button>
            <Button variant="danger" onClick={() => lancamentoParaDeletar && handleDelete(lancamentoParaDeletar.id)} disabled={!!deletandoId}>Excluir</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: confirmar apagar mes */}
      <Modal isOpen={confirmarDeletarMes} onClose={() => setConfirmarDeletarMes(false)} title={`Apagar ${mesFiltro ? formatMesLabel(mesFiltro) : ""}`} size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-600 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-200">
                Excluir todos os lancamentos de {mesFiltro ? formatMesLabel(mesFiltro) : ""}?
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {lancamentosBase.filter((l) => l.data.startsWith(mesFiltro)).length} lancamento(s) serao removidos permanentemente.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="ghost" onClick={() => setConfirmarDeletarMes(false)} disabled={deletandoMes}>Cancelar</Button>
            <Button variant="danger" onClick={handleDeleteMes} disabled={deletandoMes}>
              {deletandoMes ? "Excluindo..." : "Excluir tudo"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
