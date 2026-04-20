"use client";

import api from "@/lib/api";
import "@/app/globals.css";
import { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";

import Button from "@/components/ui/Button";

// Função para transformar texto extraído em lançamentos estruturados
function parseLancamentosFromText(text: string) {
  const linhas = text.split('\n').map(l => l.trim()).filter(Boolean);
  const lancamentos = [];
  for (const linha of linhas) {
    // Regex: Data, Descrição, Razão Social (opcional), CNPJ/CPF (opcional), Valor
    const regex = /^(\d{2}\/\d{2}\/\d{4})\s+([^\t]+)(?:\s+([^\t]+))?\s+([^\t]*)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})$/;
    const match = linha.match(regex);
    if (match) {
      lancamentos.push({
        data: match[1],
        descricao: match[2].trim(),
        razaoSocial: match[3]?.trim() || "",
        cnpj: match[4]?.trim() || "",
        valor: parseFloat(match[5].replace('.', '').replace(',', '.')),
      });
    }
  }
  return lancamentos;

}

export default function ImportarFinanceiroPage() {
  useEffect(() => {
    // Configura o worker do pdfjs para funcionar no Next.js, servindo localmente
    // @ts-ignore
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [transactions, setTransactions] = useState<any[] | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [periodo, setPeriodo] = useState<string>("");
  const [pdfText, setPdfText] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Handler para mudança de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Handler para submit do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      setLoading(true);
      setResult("");
      setTransactions(null);
      setSummary(null);
      try {
        await handlePdfParse(file);
      } catch (err: any) {
        setResult("Erro ao processar PDF.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Função para ler, extrair texto e montar lançamentos do PDF no frontend
  const handlePdfParse = async (file: File) => {
    setPdfText("");
    setTransactions(null);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" \t ") + "\n";
    }
    setPdfText(text);
    setTransactions(parseLancamentosFromText(text));
  };

  // Função para persistir os lançamentos no backend
  const handleConfirmImport = async () => {
    console.log("[DEBUG] Clique no botão Confirmar e Importar");
    console.log("[DEBUG] Transactions:", transactions);
    if (!transactions || transactions.length === 0) {
      setResult("Nenhum lançamento para importar.");
      return;
    }
    setSaving(true);
    setResult("");
    try {
      await api.post("/financeiro/lancamentos", transactions);
      setResult("Lançamentos importados com sucesso!");
      setTransactions(null);
      setSummary(null);
      setPeriodo("");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Erro ao salvar lançamentos.";
      setResult(`Erro: ${errorMsg}`);
      console.error("Erro ao salvar lançamentos:", err.response?.data || err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 font-sans text-slate-900">
      <h1 className="text-2xl font-bold mb-8">Importar Extrato Bancário</h1>
      
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-10">
        <form onSubmit={handleSubmit} className="flex gap-4 items-center">
          <input
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

      {pdfText && (
        <div className="mb-6 p-4 bg-slate-50 rounded text-xs text-slate-700 whitespace-pre-wrap max-h-64 overflow-auto">
          <b>Texto extraído do PDF:</b>
          <br />
          {pdfText}
        </div>
      )}

      {summary && (
        <div className="mb-10">
          <div className="grid grid-cols-4 gap-8 mb-8">
            <div>
              <p className="text-sm font-bold text-slate-800 mb-1">Saldo total</p>
              <p className="text-xl font-bold">R$ {formatCurrency(summary.saldoTotal)}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 mb-1">Limite da conta</p>
              <p className="text-xl font-bold">R$ {formatCurrency(summary.limite)}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 mb-1">Utilizado</p>
              <p className="text-xl font-bold">R$ {formatCurrency(summary.utilizado)}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 mb-1">Disponível</p>
              <p className="text-xl font-bold">R$ {formatCurrency(summary.disponivel)}</p>
            </div>
          </div>
          <p className="text-sm font-bold mb-6">Lançamentos do período: <span className="font-normal">{periodo}</span></p>
        </div>
      )}

      {transactions && (
        <div className="w-full">
          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-sm font-bold border-b border-slate-200">
                  <th className="py-3 pr-4">Data</th>
                  <th className="py-3 pr-4">Lançamentos</th>
                  <th className="py-3 pr-4">Razão Social</th>
                  <th className="py-3 pr-4">CNPJ/CPF</th>
                  <th className="py-3 pr-4 text-right">Valor (R$)</th>
                  <th className="py-3 text-right">Saldo (R$)</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {transactions.map((tr, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 pr-4 whitespace-nowrap">{tr.data}</td>
                    <td className="py-3 pr-4 font-medium uppercase">{tr.descricao}</td>
                    <td className="py-3 pr-4 uppercase text-slate-500">{tr.razaoSocial}</td>
                    <td className="py-3 pr-4 text-slate-500">{tr.cnpj}</td>
                    <td className={`py-3 pr-4 text-right font-medium ${tr.valor < 0 ? 'text-red-500' : (tr.valor > 0 ? 'text-green-600' : '')}`}>
                      {formatCurrency(tr.valor)}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {tr.saldo !== null ? formatCurrency(tr.saldo) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-10 flex justify-end">
            <Button size="lg" onClick={handleConfirmImport} isLoading={saving} disabled={saving}>
              Confirmar e Importar
            </Button>
          </div>
        </div>
      )}

      {result && !transactions && (
        <div className="p-4 bg-slate-50 rounded-lg text-slate-600 italic">
          {result}
        </div>
      )}
    </div>
  );
}
