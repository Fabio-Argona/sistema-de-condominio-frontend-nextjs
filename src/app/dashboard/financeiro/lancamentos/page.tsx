"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    fetch("http://localhost:8080/api/financeiro/lancamentos")
      .then((res) => res.json())
      .then((data) => setLancamentos(data))
      .finally(() => setLoading(false));
  }, []);

  const lancamentosFiltrados = tipoFiltro
    ? lancamentos.filter((l) => l.tipo === tipoFiltro)
    : lancamentos;

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
    const res = await fetch(`http://localhost:8080/api/financeiro/lancamentos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descricao: editDescricao, tipo: editTipo }),
    });
    if (res.ok) {
      setLancamentos((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, descricao: editDescricao, tipo: editTipo } : l
        )
      );
      cancelEdit();
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Receitas e Gastos</h1>
      {loading ? (
        <div>Carregando...</div>
      ) : (
        <>
          <div className="mb-4 flex gap-2 items-center">
            <label>Filtrar por tipo:</label>
            <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)} className="border rounded p-1">
              <option value="">Todos</option>
              <option value="RECEITA">Receitas</option>
              <option value="GASTO">Despesas</option>
            </select>
          </div>
          <table className="w-full border bg-white">
            <thead>
              <tr>
                <th className="border p-2">Data</th>
                <th className="border p-2">Descrição</th>
                <th className="border p-2">Valor</th>
                <th className="border p-2">Tipo</th>
                <th className="border p-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lancamentosFiltrados.map((l) => (
                <tr key={l.id}>
                  <td className="border p-2">{l.data}</td>
                  <td className="border p-2">
                    {editId === l.id ? (
                      <input value={editDescricao} onChange={e => setEditDescricao(e.target.value)} className="border rounded p-1 w-full" />
                    ) : (
                      l.descricao
                    )}
                  </td>
                  <td className="border p-2">R$ {l.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="border p-2">
                    {editId === l.id ? (
                      <select value={editTipo} onChange={e => setEditTipo(e.target.value)} className="border rounded p-1">
                        <option value="RECEITA">Receita</option>
                        <option value="GASTO">Despesa</option>
                      </select>
                    ) : (
                      l.tipo
                    )}
                  </td>
                  <td className="border p-2">
                    {editId === l.id ? (
                      <>
                        <button onClick={() => saveEdit(l.id)} className="mr-2 text-green-600">Salvar</button>
                        <button onClick={cancelEdit} className="text-red-600">Cancelar</button>
                      </>
                    ) : (
                      <button onClick={() => startEdit(l)} className="text-blue-600">Editar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
