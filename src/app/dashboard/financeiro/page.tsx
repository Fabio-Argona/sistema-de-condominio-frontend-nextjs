// Tela principal do financeiro. Aqui será incluído o botão de importação de PDF.
import Link from "next/link";

export default function FinanceiroPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Financeiro</h1>
      <div className="flex gap-4 mb-8">
        <Link href="/dashboard/financeiro/lancamentos">
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Lançamentos</button>
        </Link>
        <Link href="/dashboard/financeiro/importar">
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Importar PDF</button>
        </Link>
      </div>
      {/* Aqui você pode incluir resumos, gráficos ou cards do financeiro */}
      <div className="bg-white rounded shadow p-6">Resumo financeiro em construção...</div>
    </div>
  );
}
