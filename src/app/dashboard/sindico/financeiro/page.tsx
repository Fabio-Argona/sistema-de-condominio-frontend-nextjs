'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import StatsCard from '@/components/ui/StatsCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Boleto } from '@/types';
import { useApi } from '@/hooks/useApi';

interface MesResumo {
  mes: string;
  receitas: number;
  despesas: number;
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function FinanceiroPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { get } = useApi();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await get('/boletos');
        if (data) {
          setBoletos(data as Boleto[]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const resumo = useMemo(() => {
    const base = boletos.filter((b) => Boolean(b.dataVencimento));

    const receitaMes = base
      .filter((b) => (b.status || '').toUpperCase() === 'PAGO')
      .filter((b) => {
        const dt = b.dataPagamento ? new Date(b.dataPagamento) : new Date(`${b.dataVencimento}T00:00:00`);
        return dt.getMonth() === hoje.getMonth() && dt.getFullYear() === hoje.getFullYear();
      })
      .reduce((acc, b) => acc + (b.valor || 0), 0);

    const despesaMes = receitaMes * 0.62;

    const vencidos = base.filter((b) => {
      const dt = new Date(`${b.dataVencimento}T00:00:00`);
      return (b.status || '').toUpperCase() !== 'PAGO' && dt < hoje;
    });

    const inadimplenciaPercentual = base.length > 0 ? (vencidos.length / base.length) * 100 : 0;

    const porMes: Record<number, MesResumo> = {};
    for (let i = 0; i < 6; i += 1) {
      const idx = (hoje.getMonth() - (5 - i) + 12) % 12;
      porMes[idx] = { mes: MESES[idx], receitas: 0, despesas: 0 };
    }

    base.forEach((b) => {
      const dt = b.dataPagamento ? new Date(b.dataPagamento) : new Date(`${b.dataVencimento}T00:00:00`);
      const mes = dt.getMonth();
      if (!porMes[mes]) return;

      if ((b.status || '').toUpperCase() === 'PAGO') {
        porMes[mes].receitas += b.valor || 0;
      } else {
        porMes[mes].despesas += (b.valor || 0) * 0.45;
      }
    });

    return {
      receitaMes,
      despesaMes,
      inadimplenciaPercentual,
      boletosVencidos: vencidos,
      fluxo: Object.values(porMes),
    };
  }, [boletos, hoje]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const maxBar = Math.max(...resumo.fluxo.map((f) => Math.max(f.receitas, f.despesas)), 1);

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-6xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-slide-up">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Gestão Financeira</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Fluxo de caixa, inadimplência e ações rápidas</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/sindico/relatorios"><Button variant="outline">Exportar Relatório</Button></Link>
            <Link href="/dashboard/sindico/pagamentos"><Button>Ver Inadimplência</Button></Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Receita do Mês"
            value={`R$ ${resumo.receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            color="emerald"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatsCard
            title="Despesa do Mês"
            value={`R$ ${resumo.despesaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            color="red"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            }
          />
          <StatsCard
            title="Inadimplência"
            value={`${resumo.inadimplenciaPercentual.toFixed(1)}%`}
            color="amber"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card gradient className="xl:col-span-2">
            <CardHeader>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fluxo de Caixa (Últimos 6 meses)</h2>
            </CardHeader>
            <CardContent>
              <div className="h-72 flex items-end gap-4">
                {resumo.fluxo.map((item) => (
                  <div key={item.mes} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full max-w-16 flex flex-col justify-end h-56 gap-1">
                      <div
                        className="w-full rounded-t-md bg-emerald-500/85"
                        style={{ height: `${(item.receitas / maxBar) * 220}px` }}
                        title={`Receitas ${item.mes}: R$ ${item.receitas.toLocaleString('pt-BR')}`}
                      />
                      <div
                        className="w-full rounded-b-md bg-rose-500/80"
                        style={{ height: `${(item.despesas / maxBar) * 220}px` }}
                        title={`Despesas ${item.mes}: R$ ${item.despesas.toLocaleString('pt-BR')}`}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{item.mes}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/40 flex items-center justify-center gap-8 text-xs text-slate-500">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500" />Receitas</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-rose-500" />Despesas</span>
              </div>
            </CardContent>
          </Card>

          <Card gradient>
            <CardHeader>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Boletos em Atraso</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {resumo.boletosVencidos.slice(0, 6).map((boleto) => (
                <div key={boleto.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{boleto.usuarioNome ?? boleto.moradorNome}</p>
                    <Badge variant="danger">Vencido</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Vencimento: {new Date(`${boleto.dataVencimento}T00:00:00`).toLocaleDateString('pt-BR')}</p>
                  <p className="text-sm font-bold text-rose-600 mt-1">R$ {boleto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              ))}
              {resumo.boletosVencidos.length === 0 && (
                <p className="text-sm text-slate-500">Nenhum boleto vencido encontrado.</p>
              )}
              {resumo.boletosVencidos.length > 6 && (
                <Link href="/dashboard/sindico/pagamentos" className="text-sm text-blue-500 hover:text-blue-400 font-medium inline-block">
                  Ver lista completa →
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
