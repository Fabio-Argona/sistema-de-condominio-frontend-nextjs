'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import StatsCard from '@/components/ui/StatsCard';
import Badge from '@/components/ui/Badge';
import { DashboardActions, DashboardHero, DashboardPage, DashboardSectionTitle } from '@/components/layout/RoleDashboard';
import { Boleto } from '@/types';
import { useApi } from '@/hooks/useApi';
import { getAgoraBR, parseDataBR, formatarDataBR } from '@/utils/dateUtils';


interface MesResumo {
  mes: string;
  receitas: number;
  despesas: number;
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function FinanceiroPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { get } = useApi();

  useEffect(() => {
    const load = async () => {
      try {
        const [boletosData, lancamentosData] = await Promise.all([
          get('/boletos'),
          get('/financeiro/lancamentos')
        ]);
        
        if (boletosData) setBoletos(boletosData as Boleto[]);
        if (lancamentosData) setLancamentos(lancamentosData as any[]);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hoje = useMemo(() => {
    const d = getAgoraBR();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const resumo = useMemo(() => {
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const DESCRICOES_SALDO = ["SALDO TOTAL", "SALDO ANTERIOR", "SALDO EM CONTA"];

    // ── Resumo do Lançamentos (Extrato Real) ──
    const lancamentosBase = lancamentos.filter(l => !DESCRICOES_SALDO.some(s => l.descricao.toUpperCase().includes(s)));
    
    const receitaRealMes = lancamentosBase
      .filter(l => {
        const dt = new Date(l.data);
        return dt.getMonth() === mesAtual && dt.getFullYear() === anoAtual && l.tipo === 'RECEITA';
      })
      .reduce((acc, l) => acc + Number(l.valor), 0);

    const despesaRealMes = lancamentosBase
      .filter(l => {
        const dt = parseDataBR(l.data);
        return dt.getMonth() === mesAtual && dt.getFullYear() === anoAtual && l.tipo === 'GASTO';
      })
      .reduce((acc, l) => acc + Number(l.valor), 0);

    // ── Resumo de Boletos (Cobranda) ──
    const baseBoletos = boletos.filter((b) => Boolean(b.dataVencimento));
    const vencidos = baseBoletos.filter((b) => {
      const dt = new Date(`${b.dataVencimento}T00:00:00`);
      return (b.status || '').toUpperCase() !== 'PAGO' && dt < hoje;
    });

    const inadimplenciaPercentual = baseBoletos.length > 0 ? (vencidos.length / baseBoletos.length) * 100 : 0;

    // ── Fluxo Histórico (6 meses) ──
    const porMes: Record<number, MesResumo> = {};
    for (let i = 0; i < 6; i += 1) {
      const idx = (hoje.getMonth() - (5 - i) + 12) % 12;
      porMes[idx] = { mes: MESES[idx], receitas: 0, despesas: 0 };
    }

    // Soma entradas reais
    lancamentosBase.forEach(l => {
      const dt = parseDataBR(l.data);
      const mes = dt.getMonth();
      if (porMes[mes]) {
        if (l.tipo === 'RECEITA') porMes[mes].receitas += Number(l.valor);
        else porMes[mes].despesas += Number(l.valor);
      }
    });

    return {
      receitaMes: receitaRealMes,
      despesaMes: despesaRealMes,
      inadimplenciaPercentual,
      boletosVencidos: vencidos,
      fluxo: Object.values(porMes),
    };
  }, [boletos, lancamentos, hoje]);

  if (isLoading) {
    return (
      <DashboardPage>
        <div className="space-y-6 animate-pulse">
          <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl" />)}
          </div>
        </div>
      </DashboardPage>
    );
  }

  const maxBar = Math.max(...resumo.fluxo.map((f) => Math.max(f.receitas, f.despesas)), 1);
  const saldoMes = resumo.receitaMes - resumo.despesaMes;

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Financeiro Real"
        title="Painel de controle de caixa"
        description="Visualize o saldo real da conta corrente baseado nos extratos importados e monitore a inadimplência dos boletos."
        status={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={resumo.boletosVencidos.length > 0 ? 'danger' : 'success'} dot>
              {resumo.boletosVencidos.length > 0 ? `${resumo.boletosVencidos.length} boletos em atraso` : 'Sem boletos em atraso'}
            </Badge>
            <Badge variant={saldoMes >= 0 ? 'success' : 'danger'}>
              Saldo real {saldoMes >= 0 ? 'positivo' : 'deficitário'} no mês
            </Badge>
          </div>
        }
        aside={
          <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Leitura rápida</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">Saldo Real (Entradas - Saídas)</p>
                <p className={`mt-1 text-2xl font-black ${saldoMes >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  R$ {saldoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">Taxa de Inadimplência</p>
                <p className="mt-1 text-2xl font-black text-amber-600">{resumo.inadimplenciaPercentual.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        }
      />

      <DashboardActions
        actions={[
          {
            href: '/dashboard/financeiro/lancamentos',
            title: 'Conciliação',
            description: 'Acompanhe todos os lançamentos reais da conta corrente.',
            accent: 'border-blue-200/70 bg-gradient-to-br from-blue-50 to-white dark:border-blue-900/40 dark:from-blue-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
          },
          {
            href: '/dashboard/sindico/relatorios',
            title: 'Relatórios',
            description: 'Exporte e consolide indicadores financeiros do condomínio.',
            accent: 'border-indigo-200/70 bg-gradient-to-br from-indigo-50 to-white dark:border-indigo-900/40 dark:from-indigo-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
          },
          {
            href: '/dashboard/financeiro/importar',
            title: 'Importar PDF',
            description: 'Faça upload do extrato financeiro em PDF para importar lançamentos.',
            accent: 'border-green-200/70 bg-gradient-to-br from-green-50 to-white dark:border-green-900/40 dark:from-green-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatsCard
          title="Entradas (Mês)"
          value={`R$ ${resumo.receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          color="emerald"
          subtitle="Total de receitas reais registradas"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatsCard
          title="Saídas (Mês)"
          value={`R$ ${resumo.despesaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          color="red"
          subtitle="Total de despesas reais pagas"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatsCard
          title="Inadimplência"
          value={`${resumo.inadimplenciaPercentual.toFixed(1)}%`}
          color="amber"
          subtitle="Percentual de boletos em atraso hoje"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card gradient className="xl:col-span-2">
          <CardHeader>
            <DashboardSectionTitle title="Fluxo de Caixa Real" description="Comparativo mensal entre entradas e saídas reais da conta corrente." action={<Link href="/dashboard/sindico/relatorios" className="text-sm font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Abrir relatório</Link>} />
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-end gap-4 overflow-x-auto pb-4 pt-2">
              {resumo.fluxo.map((item) => (
                <div key={item.mes} className="flex-1 min-w-[60px] flex flex-col items-center gap-2">
                  <div className="w-full max-w-16 flex flex-col justify-end h-56 gap-1">
                    <div
                      className="w-full rounded-t-md bg-emerald-500/85 transition-all hover:bg-emerald-400"
                      style={{ height: `${(item.receitas / maxBar) * 220}px` }}
                      title={`Entradas ${item.mes}: R$ ${item.receitas.toLocaleString('pt-BR')}`}
                    />
                    <div
                      className="w-full rounded-b-md bg-rose-500/80 transition-all hover:bg-rose-400"
                      style={{ height: `${(item.despesas / maxBar) * 220}px` }}
                      title={`Saídas ${item.mes}: R$ ${item.despesas.toLocaleString('pt-BR')}`}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{item.mes}</span>
                </div>
              ))}
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/40 flex items-center justify-center gap-8 text-xs text-slate-500">
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500" />Entradas Reais</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-rose-500" />Saídas Reais</span>
            </div>
          </CardContent>
        </Card>

        <Card gradient>
          <CardHeader>
            <DashboardSectionTitle title="Boletos em atraso" description="Principais pendências do faturamento." />
          </CardHeader>
          <CardContent className="space-y-3">
            {resumo.boletosVencidos.slice(0, 6).map((boleto) => (
              <div key={boleto.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{boleto.usuarioNome ?? boleto.moradorNome}</p>
                  <Badge variant="danger">Vencido</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">Vencimento: {formatarDataBR(boleto.dataVencimento)}</p>
                <p className="text-sm font-bold text-rose-600 mt-1">R$ {boleto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            ))}
            {resumo.boletosVencidos.length === 0 && (
              <p className="text-sm text-slate-500">Nenhum boleto vencido encontrado.</p>
            )}
            {resumo.boletosVencidos.length > 6 && (
              <Link href="/dashboard/sindico/pagamentos" className="text-sm text-blue-500 hover:text-blue-400 font-medium inline-block">
                Ver completa →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardPage>
  );
}
