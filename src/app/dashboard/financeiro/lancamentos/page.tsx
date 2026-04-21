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
  const [editId, setEditId] = useState<number | null>(null);
  const [editDescricao, setEditDescricao] = useState("");
  const [editTipo, setEditTipo] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    api
      .get("/financeiro/lancamentos")
      .then((res) => {
        // Ordena por data decrescente (mais recente primeiro)
        const sorted = [...res.data].sort((a: LancamentoFinanceiro, b: LancamentoFinanceiro) =>
          b.data.localeCompare(a.data)
        );
        setLancamentos(sorted);
      })
      .finally(() => setLoading(false));
  }, []);

  // Lançamento mais recente com "SALDO TOTAL" na descrição
  const saldoEntry = lancamentos.find((l) =>
    l.descricao.toUpperCase().includes("SALDO TOTAL")
  );

  // Base: exclui entradas de SALDO TOTAL da tabela
  const lancamentosBase = lancamentos.filter(
    (l) => !l.descricao.toUpperCase().includes("SALDO TOTAL")
  );

  // Totais gerais (sem filtro de tipo) para os cards
  const totalDespesas = lancamentosBase
    .filter((l) => l.tipo === "GASTO")
    .reduce((acc, l) => acc + Number(l.valor), 0);

  const totalCobracas = lancamentosBase
    .filter((l) => l.tipo === "RECEITA")
    .reduce((acc, l) => acc + Number(l.valor), 0);

  // Lançamentos da tabela: aplica filtros
  const lancamentosFiltrados = lancamentosBase
    .filter((l) => (tipoFiltro ? l.tipo === tipoFiltro : true))
    .filter((l) =>
      busca ? l.descricao.toLowerCase().includes(busca.toLowerCase()) : true
    );

  // Totais das linhas filtradas (para o rodapé da tabela)
  const totalFiltradoDespesas = lancamentosFiltrados
    .filter((l) => l.tipo === "GASTO")
    .reduce((acc, l) => acc + Number(l.valor), 0);

  const totalFiltradoCobracas = lancamentosFiltrados
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

        {/* Card: Total Despesas */}
        <div className="rounded-xl p-5 border bg-red-50 border-red-200">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-red-500">
            Total Despesas
          </p>
          <p className="text-2xl font-bold text-red-600">
            R$ {formatCurrency(totalDespesas)}
          </p>
          <p className="text-xs text-red-300 mt-1">
            {lancamentosBase.filter((l) => l.tipo === "GASTO").length} lançamento(s)
          </p>
        </div>

        {/* Card: Total Cobranças */}
        <div className="rounded-xl p-5 border bg-green-50 border-green-200">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-green-600">
            Total Cobranças / Receitas
          </p>
          <p className="text-2xl font-bold text-green-700">
            R$ {formatCurrency(totalCobracas)}
          </p>
          <p className="text-xs text-green-400 mt-1">
            {lancamentosBase.filter((l) => l.tipo === "RECEITA").length} lançamento(s)
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
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
          <option value="RECEITA">Cobranças / Receitas</option>
        </select>
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
                <th className="py-3 px-4 text-right bg-green-50 text-green-500">Cobrança (R$)</th>
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
                        <option value="RECEITA">Cobrança / Receita</option>
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
                        {l.tipo === "RECEITA" ? "Cobrança" : "Despesa"}
                      </span>
                    )}
                  </td>

                  {/* Coluna Despesa — só preenchida para GASTO */}
                  <td className="py-3 px-4 text-right bg-red-50/40 font-semibold text-red-500">
                    {l.tipo === "GASTO"
                      ? `R$ ${formatCurrency(Number(l.valor))}`
                      : ""}
                  </td>

                  {/* Coluna Cobrança — só preenchida para RECEITA */}
                  <td className="py-3 px-4 text-right bg-green-50/40 font-semibold text-green-600">
                    {l.tipo === "RECEITA"
                      ? `R$ ${formatCurrency(Number(l.valor))}`
                      : ""}
                  </td>

                  <td className="py-3 px-4 text-center">
                    {editId === l.id ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => saveEdit(l.id)}
                          className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg transition-colors"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1 rounded-lg border border-slate-200 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(l)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors"
                      >
                        Editar
                      </button>
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
                  {totalFiltradoDespesas > 0
                    ? `R$ ${formatCurrency(totalFiltradoDespesas)}`
                    : "—"}
                </td>
                <td className="py-3 px-4 text-right bg-green-100 text-green-700">
                  {totalFiltradoCobracas > 0
                    ? `R$ ${formatCurrency(totalFiltradoCobracas)}`
                    : "—"}
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
