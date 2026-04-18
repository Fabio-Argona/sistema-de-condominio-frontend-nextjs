"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

export default function ImportarFinanceiroPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

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
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:8080/api/financeiro/importar", {
        method: "POST",
        body: formData,
      });
      const data = await res.text();
      setResult(data);
    } catch (err) {
      setResult("Erro ao enviar arquivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Importar Extrato Financeiro (PDF)</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full border rounded p-2"
        />
        <Button type="submit" disabled={!file || loading}>
          {loading ? "Enviando..." : "Importar PDF"}
        </Button>
      </form>
      {result && <div className="mt-6 p-4 bg-slate-100 rounded">{result}</div>}
    </div>
  );
}
