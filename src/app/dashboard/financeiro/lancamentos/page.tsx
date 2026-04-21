"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

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
  const [mesFiltro, setMesFiltro] = useState<string>(""); // "yyyy-MM"
  const [editId, setEditId] = useState<number | null>(null);
  const [editDescricao, setEditDescricao] = useState("");
  const [editTipo, setEditTipo] = useState("");
  const [busca, setBusca] = useState("");
  const [deletandoId, setDeletandoId] = useState<number | null>(null);
  const [deletandoMes, setDeletandoMes] = useState(false);

  useEffect(() => {
    carregarLancamentos();
  }, []);

  const carregarLancamentos = () => {
    setLoading(true);
    api
      .get("/financeiro/lancamentos")
      .then((res) => {
        const sorted = [...res.data].sort((a: LancamentoFinanceiro, b: LancamentoFinanceiro) =>
          b.data.localeCompare(a.data)
        );
        setLancamentos(sorted);
      })
      .finally(() => setLoading(false));
  };

  // Lançamento mais recente com "SALDO TOTAL" na descrição
  const saldoEntry = lancamentos.find((l) =>
    l.descricao.toUpperCase().includes("SALDO TOTAL")
  );

  // Base: exclui entradas de SALDO TOTAL da tabela
  const lancamentosBase = lancamentos.filter(
    (l) => !l.descricao.toUpperCase().includes("SALDO TOTAL")
  );

  // Totais gerais (para os cards)
  // Termos que identificam despesas com cobranças bancárias
  const TERMOS_COBRANCA = ["TAR/CUSTAS COBRANCA", "TAR COBRANCA EXP", "SERV SEM NOME CONTRAPART"];

  const ehCobrancaBancaria = (descricao: string) =>
    TERMOS_COBRANCA.some((t) => descricao.toUpperCase().includes(t.toUpperCase()));

  const totalDespesasCobrancas = lancamentosBase
    .filter((l) => l.tipo === "GASTO" && ehCobrancaBancaria(l.descricao))
    .reduce((acc, l) => acc + Number(l.valor), 0);

  const qtdDespesasCobrancas = lancamentosBase
    .filter((l) => l.tipo === "GASTO" && ehCobrancaBancaria(l.descricao)).length;

  const totalReceitas = lancamentosBase
    .filter((l) => l.tipo === "RECEITA")
    .reduce((acc, l) => acc + Number(l.valor), 0);

  // Lançamentos da tabela com filtros aplicados
  const lancamentosFiltrados = lancamentosBase
    .filter((l) => (tipoFiltro ? l.tipo === tipoFiltro : true))
    .filter((l) => (mesFiltro ? l.data.startsWith(mesFiltro) : true))
    .filter((l) =>
      busca ? l.descricao.toLowerCase().includes(busca.toLowerCase()) : true
    );

  // Meses disponíveis (derivados dos dados)
  const mesesDisponiveis = Array.from(
    new Set(lancamentosBase.map((l) => l.data.substring(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  const formatMesLabel = (ym: string) => {
    const [ano, mes] = ym.split("-");
    const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${nomes[parseInt(mes) - 1]}/${ano}`;
  };

  // Totais das linhas filtradas (rodapé)
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
      await api.put(`/financeiro/lancamentos/${id}`, {
        descricao: editDescricao,
        tipo: editTipo,
      });
      setLancamentos((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, descricao: editDescricao, tipo: editTipo } : l
        )
      );
      cancelEdit();
    } catch {
      alert("Erro ao salvar alteração.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;
    setDeletandoId(id);
    try {
      await api.delete(`/financeiro/lancamentos/${id}`);
      setLancamentos((prev) => prev.filter((l) => l.id !== id));
    } catch {
      alert("Erro ao excluir lançamento.");
    } finally {
      setDeletandoId(null);
    }
  };

  const handleDeleteMes = async () => {
    if (!mesFiltro) return;
    const label = formatMesLabel(mesFiltro);
    const doMes = lancamentosBase.filter((l) => l.data.startsWith(mesFiltro));
    const qtd = doMes.length;
    if (!confirm(`Excluir TODOS os ${qtd} lançamento(s) de ${label}? Esta ação não pode ser desfeita.`)) return;
    setDeletandoMes(true);
    try {
      // Deleta cada lançamento individualmente usando o endpoint existente
      await Promise.all(doMes.map((l) => api.delete(`/financeiro/lancamentos/${l.id}`)));
      setLancamentos((prev) => prev.filter((l) => !l.data.startsWith(mesFiltro)));
      setMesFiltro("");
    } catch {
      alert("Erro ao excluir lançamentos do mês.");
    } finally {
      setDeletandoMes(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 font-sans text-slate-900">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Lançamentos Financeiros</h1>
        <a
          href="/dashboard/financeiro/importar"
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Importar Extrato
        </a>
      </div>

      {/* 3 Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

        {/* Card: Saldo Total Disponível */}
        {saldoEntry ? (
          <div className="rounded-xl p-5 border bg-blue-50 border-blue-200">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-blue-600">
              Saldo Total Disponível
            </p>
            <p className="text-2xl font-bold text-blue-700">
              R$ {formatCurrency(Number(saldoEntry.valor))}
            </p>
            <p className="text-xs text-blue-400 mt-1">
              Referência: {formatDate(saldoEntry.data)}
            </p>
          </div>
        ) : (
          <div className="rounded-xl p-5 border bg-slate-50 border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">
              Saldo Total Disponível
            </p>
            <p className="text-lg text-slate-400">—</p>
          </div>
        )}

        {/* Card: Total Despesas com Cobranças */}
        <div className="rounded-xl p-5 border bg-red-50 border-red-200">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-red-500">
            Total Despesas com Cobranças
          </p>
          <p className="text-2xl font-bold text-red-600">
            R$ {formatCurrency(totalDespesasCobrancas)}
          </p>
          <p className="text-xs text-red-300 mt-1">
            {qtdDespesasCobrancas} cobrança(s) bancária(s)
          </p>
        </div>

        {/* Card: Total Receitas */}
        <div className="rounded-xl p-5 border bg-green-50 border-green-200">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-green-600">
            Total Receitas
          </p>
          <p className="text-2xl font-bold text-green-700">
            R$ {formatCurrency(totalReceitas)}
          </p>
          <p className="text-xs text-green-400 mt-1">
            {lancamentosBase.filter((l) => l.tipo === "RECEITA").length} lançamento(s)
          </p>
        </div>
      </div>

      {/* Escala de meses — clique para filtrar */}
      {mesesDisponiveis.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Navegar por mês</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {/* Botão "Todos" */}
            <button
              onClick={() => setMesFiltro("")}
              className={`flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                mesFiltro === ""
                  ? "bg-slate-800 text-white border-slate-800 shadow-md"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700"
              }`}
            >
              <span className="text-[10px] uppercase tracking-wide">Todos</span>
              <span className="text-base font-bold mt-0.5">{lancamentosBase.length}</span>
              <span className="text-[10px] opacity-70">itens</span>
            </button>

            {mesesDisponiveis.map((ym) => {
              const qtdMes = lancamentosBase.filter((l) => l.data.startsWith(ym)).length;
              const despMes = lancamentosBase
                .filter((l) => l.data.startsWith(ym) && l.tipo === "GASTO")
                .reduce((acc, l) => acc + Number(l.valor), 0);
              const recMes = lancamentosBase
                .filter((l) => l.data.startsWith(ym) && l.tipo === "RECEITA")
                .reduce((acc, l) => acc + Number(l.valor), 0);
              const ativo = mesFiltro === ym;
              return (
                <button
                  key={ym}
                  onClick={() => setMesFiltro(ym)}
                  className={`flex-shrink-0 flex flex-col items-start px-4 py-2.5 rounded-xl border text-xs transition-all ${
                    ativo
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  <span className={`text-[10px] uppercase tracking-wide font-bold ${ ativo ? "text-blue-100" : "text-slate-400" }`}>
                    {formatMesLabel(ym)}
                  </span>
                  <span className="text-base font-bold mt-0.5">{qtdMes}</span>
                  <div className={`flex gap-2 text-[10px] mt-0.5 ${ ativo ? "text-blue-100" : "" }`}>
                    {despMes > 0 && <span className={ativo ? "text-red-200" : "text-red-400"}>-{formatCurrency(despMes)}</span>}
                    {recMes > 0 && <span className={ativo ? "text-green-200" : "text-green-500"}>+{formatCurrency(recMes)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <input
          type="text"
          placeholder="Buscar descrição..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Todos os tipos</option>
          <option value="GASTO">Despesas</option>
          <option value="RECEITA">Receitas</option>
        </select>

        {/* Botão apagar todos do mês selecionado */}
        {mesFiltro && (
          <button
            onClick={handleDeleteMes}
            disabled={deletandoMes}
            title={`Apagar todos os lançamentos de ${formatMesLabel(mesFiltro)}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deletandoMes ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
            Apagar {formatMesLabel(mesFiltro)}
          </button>
        )}
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          Carregando lançamentos...
        </div>
      ) : lancamentosFiltrados.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
          Nenhum lançamento encontrado.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left bg-white">
            <thead>
              <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-400 border-b border-slate-200">
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4 text-right bg-red-50 text-red-400">Despesa (R$)</th>
                <th className="py-3 px-4 text-right bg-green-50 text-green-500">Receita (R$)</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {lancamentosFiltrados.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {formatDate(l.data)}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {editId === l.id ? (
                      <input
                        value={editDescricao}
                        onChange={(e) => setEditDescricao(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    ) : (
                      l.descricao
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editId === l.id ? (
                      <select
                        value={editTipo}
                        onChange={(e) => setEditTipo(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        <option value="RECEITA">Receita</option>
                        <option value="GASTO">Despesa</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          l.tipo === "RECEITA"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {l.tipo === "RECEITA" ? "Receita" : "Despesa"}
                      </span>
                    )}
                  </td>

                  {/* Coluna Despesa */}
                  <td className="py-3 px-4 text-right bg-red-50/40 font-semibold text-red-500">
                    {l.tipo === "GASTO" ? `R$ ${formatCurrency(Number(l.valor))}` : ""}
                  </td>

                  {/* Coluna Receita */}
                  <td className="py-3 px-4 text-right bg-green-50/40 font-semibold text-green-600">
                    {l.tipo === "RECEITA" ? `R$ ${formatCurrency(Number(l.valor))}` : ""}
                  </td>

                  {/* Ações */}
                  <td className="py-3 px-4 text-center">
                    {editId === l.id ? (
                      <div className="flex gap-1 justify-center">
                        {/* Salvar */}
                        <button
                          onClick={() => saveEdit(l.id)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Salvar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        {/* Cancelar */}
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                          title="Cancelar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-center">
                        {/* Editar */}
                        <button
                          onClick={() => startEdit(l)}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Excluir */}
                        <button
                          onClick={() => handleDelete(l.id)}
                          disabled={deletandoId === l.id}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          {deletandoId === l.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Rodapé com totais */}
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
      )}
    </div>
  );
}
