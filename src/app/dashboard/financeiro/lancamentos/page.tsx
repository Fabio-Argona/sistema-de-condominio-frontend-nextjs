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
  const [tipoFiltro, setTipoFiltro] = useState<string>("GASTO");
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

  // Encontra o lançamento mais recente com "SALDO TOTAL" na descrição
  const saldoEntry = lancamentos.find((l) =>
    l.descricao.toUpperCase().includes("SALDO TOTAL")
  );

  // Lançamentos da tabela: exclui entradas de SALDO TOTAL (são apenas referência)
  const lancamentosFiltrados = lancamentos
    .filter((l) => !l.descricao.toUpperCase().includes("SALDO TOTAL"))
    .filter((l) => (tipoFiltro ? l.tipo === tipoFiltro : true))
    .filter((l) =>
      busca
        ? l.descricao.toLowerCase().includes(busca.toLowerCase())
        : true
    );

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    // "2026-03-09" -> "09/03/2026"
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

      {/* Card de Saldo Total Disponível */}
      <div className="mb-8">
        {saldoEntry ? (
          <div className="inline-block rounded-xl p-5 border bg-blue-50 border-blue-200">
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
          <div className="inline-block rounded-xl p-5 border bg-slate-50 border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-slate-400">
              Saldo Total Disponível
            </p>
            <p className="text-lg text-slate-400">Nenhum registro encontrado</p>
          </div>
        )}
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
          <option value="GASTO">Despesas / Cobranças</option>
          <option value="">Todos os tipos</option>
          <option value="RECEITA">Receitas</option>
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
                <th className="py-3 px-4 text-right">Valor (R$)</th>
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
                  <td
                    className={`py-3 px-4 text-right font-semibold ${
                      l.tipo === "GASTO" ? "text-red-500" : "text-green-600"
                    }`}
                  >
                    {l.tipo === "GASTO" ? "- " : "+ "}
                    R$ {formatCurrency(Number(l.valor))}
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
          </table>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-400">
            {lancamentosFiltrados.length} lançamento
            {lancamentosFiltrados.length !== 1 ? "s" : ""} encontrado
            {lancamentosFiltrados.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
