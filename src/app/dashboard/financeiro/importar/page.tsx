"use client";

import "@/app/globals.css";
import { useState } from "react";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import Cookies from "js-cookie";

interface Lancamento {
  data: string;
  descricao: string;
  razaoSocial: string;
  cnpj?: string;
  valor: number;
  saldo: number | null;
}

export default function ImportarFinanceiroPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [transactions, setTransactions] = useState<Lancamento[] | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [periodo, setPeriodo] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Handler para mudança de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult("");
      setTransactions(null);
      setSummary(null);
    }
  };

  // Handler para submit do formulário — envia o PDF para a API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult("");
    setTransactions(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Inclui o token JWT no header para autenticação no backend
      const token = Cookies.get("token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const resp = await fetch("/api/financeiro/importar", {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await resp.json();

      if (!resp.ok) {
        setResult(`Erro ao processar PDF: ${data.message || resp.statusText}`);
        return;
      }

      setTransactions(data.transacoes || []);
      setSummary(data.resumo || null);
      setPeriodo(data.periodo || "");
    } catch (err: any) {
      setResult("Erro ao processar PDF: " + (err.message || "desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  // Função para persistir os lançamentos no banco via API Next.js
  const handleConfirmImport = async () => {
    if (!transactions || transactions.length === 0) {
      setResult("Nenhum lançamento para importar.");
      return;
    }

    setSaving(true);
    setResult("");

    try {
      // Converte para o formato esperado pelo backend Spring Boot:
      // { data: "yyyy-MM-dd", descricao: string, valor: number, tipo: "RECEITA"|"GASTO" }
      const payload = transactions.map((t) => {
        // Converte "dd/MM/yyyy" → "yyyy-MM-dd"
        const [dia, mes, ano] = t.data.split("/");
        const dataISO = `${ano}-${mes}-${dia}`;
        const desc = [t.descricao, t.razaoSocial].filter(Boolean).join(" — ");
        return {
          data: dataISO,
          descricao: desc.substring(0, 255),
          valor: Math.abs(t.valor),
          tipo: t.valor >= 0 ? "RECEITA" : "GASTO",
        };
      });

      await api.post("/financeiro/lancamentos", payload);

      setResult("✅ Lançamentos importados com sucesso!");
      setTransactions(null);
      setSummary(null);
      setPeriodo("");
      setFile(null);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Erro ao salvar lançamentos.";
      setResult(`Erro: ${msg}`);
      console.error("[Confirmar Importar]", err.response?.data || err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 font-sans text-slate-900">
      <h1 className="text-2xl font-bold mb-8">Importar Extrato Bancário</h1>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-10">
        <form onSubmit={handleSubmit} className="flex gap-4 items-center">
          <input
            key={file ? file.name : "empty"}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="flex-1 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
          />
          <Button type="submit" disabled={!file || loading} className="px-8">
            {loading ? "Processando..." : "Analisar PDF"}
          </Button>
        </form>
      </div>

      {summary && (
        <div className="mb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs font-semibold text-blue-600 mb-1 uppercase tracking-wide">Saldo Total</p>
              <p className="text-lg font-bold text-slate-800">R$ {formatCurrency(summary.saldoTotal ?? 0)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Disponível</p>
              <p className="text-lg font-bold text-slate-800">R$ {formatCurrency(summary.disponivel ?? 0)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Limite</p>
              <p className="text-lg font-bold text-slate-800">R$ {formatCurrency(summary.limite ?? 0)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Utilizado</p>
              <p className="text-lg font-bold text-slate-800">R$ {formatCurrency(summary.utilizado ?? 0)}</p>
            </div>
          </div>
          {periodo && (
            <p className="text-sm text-slate-600">
              <span className="font-semibold">Período:</span> {periodo}
            </p>
          )}
        </div>
      )}

      {transactions && transactions.length > 0 && (
        <div className="w-full">
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Lançamento</th>
                  <th className="py-3 px-4">Razão Social</th>
                  <th className="py-3 px-4">CNPJ/CPF</th>
                  <th className="py-3 px-4 text-right">Valor (R$)</th>
                  <th className="py-3 px-4 text-right">Saldo (R$)</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {transactions.map((tr, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">{tr.data}</td>
                    <td className="py-3 px-4 font-medium text-slate-800 uppercase">{tr.descricao}</td>
                    <td className="py-3 px-4 text-slate-500 uppercase">{tr.razaoSocial}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs font-mono">{tr.cnpj || ""}</td>
                    <td
                      className={`py-3 px-4 text-right font-semibold ${
                        tr.valor < 0 ? "text-red-500" : tr.valor > 0 ? "text-green-600" : "text-slate-600"
                      }`}
                    >
                      {formatCurrency(tr.valor)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-mono text-xs">
                      {tr.saldo !== null && tr.saldo !== undefined ? formatCurrency(tr.saldo) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400 mt-2 mb-6">
            {transactions.length} lançamento{transactions.length !== 1 ? "s" : ""} encontrado{transactions.length !== 1 ? "s" : ""}
          </p>

          <div className="flex justify-end">
            <Button size="lg" onClick={handleConfirmImport} disabled={saving}>
              {saving ? "Salvando..." : "Confirmar e Importar"}
            </Button>
          </div>
        </div>
      )}

      {transactions && transactions.length === 0 && (
        <div className="p-6 bg-yellow-50 rounded-xl border border-yellow-200 text-yellow-700">
          Nenhum lançamento foi encontrado no PDF. Verifique o arquivo e tente novamente.
        </div>
      )}

      {result && (
        <div
          className={`mt-6 p-4 rounded-xl border text-sm ${
            result.startsWith("✅")
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {result}
        </div>
      )}
    </div>
  );
}
