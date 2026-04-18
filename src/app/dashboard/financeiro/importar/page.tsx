
"use client";
import api from "@/lib/api";
import { useState } from "react";
import Button from "@/components/ui/Button";

export default function ImportarFinanceiroPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [transactions, setTransactions] = useState<any[] | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult("");
    setTransactions(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/financeiro/importar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data.message);
      if (res.data.transacoes) {
        setTransactions(res.data.transacoes);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Erro ao enviar arquivo.";
      setResult(`Erro: ${errorMsg}`);
      console.error("Erro na importação:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">Importar Extrato Financeiro (PDF)</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100"
          />
          <Button type="submit" disabled={!file || loading} className="w-full">
            {loading ? "Processando e Analisando..." : "Importar e Gerar Tabela"}
          </Button>
        </form>
      </div>

      {result && !transactions && (
        <div className="mt-6 p-4 bg-slate-100 rounded-lg text-slate-700 whitespace-pre-wrap text-sm">
          {result}
        </div>
      )}

      {transactions && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-slate-700">Lançamentos Identificados</h2>
          <div className="overflow-hidden bg-white shadow-md sm:rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Valor</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {transactions.map((tr, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{tr.data}</td>
                    <td className="px-6 py-4 text-sm text-slate-800">{tr.descricao}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${tr.valor < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {tr.valor < 0 ? `- R$ ${Math.abs(tr.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `R$ ${tr.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-end gap-3">
             <Button variant="outline" onClick={() => setTransactions(null)}>Limpar</Button>
             <Button onClick={() => alert("Função de salvar será implementada em breve!")}>Salvar no Banco</Button>
          </div>
        </div>
      )}
    </div>
  );
}
