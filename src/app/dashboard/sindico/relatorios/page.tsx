'use client';

import { useEffect, useMemo, useState } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatsCard from '@/components/ui/StatsCard';
import { DashboardActions, DashboardHero, DashboardPage, DashboardSectionTitle } from '@/components/layout/RoleDashboard';
import toast from 'react-hot-toast';
import { Boleto } from '@/types';
import { useApi } from '@/hooks/useApi';

interface CashFlowMonth {
  mes: string;
  receita: number;
  despesa: number;
  saldo: number;
}

interface BillingMonth {
  mes: string;
  recebido: number;
  pendente: number;
  atrasado: number;
}

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState<'cobranca' | 'extrato'>('cobranca');
  const [billingData, setBillingData] = useState<BillingMonth[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowMonth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { get } = useApi();

  const sortedMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [boletos, lancamentos] = await Promise.all([
          get('/boletos') as Promise<Boleto[]>,
          get('/financeiro/lancamentos') as Promise<any[]>
        ]);

        // ─── Processamento de Cobrança (Boletos) ───
        const billingMap: Record<string, { recebido: number, pendente: number, atrasado: number }> = {};
        boletos.forEach(b => {
          const date = new Date(new Date(b.dataVencimento).getTime() + 86400000);
          const monthName = date.toLocaleString('pt-BR', { month: 'short' });
          const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', '');
          
          if (!billingMap[capitalizedMonth]) {
            billingMap[capitalizedMonth] = { recebido: 0, pendente: 0, atrasado: 0 };
          }
          
          if (b.status === 'PAGO') billingMap[capitalizedMonth].recebido += b.valor;
          else if (b.status === 'PENDENTE') billingMap[capitalizedMonth].pendente += b.valor;
          else if (b.status === 'VENCIDO') billingMap[capitalizedMonth].atrasado += b.valor;
        });

        // ─── Processamento de Cash Flow (Extrato) ───
        const DESCRICOES_SALDO = ["SALDO TOTAL", "SALDO ANTERIOR", "SALDO EM CONTA"];
        const cashFlowMap: Record<string, { receita: number, despesa: number }> = {};
        
        lancamentos.forEach(l => {
          if (DESCRICOES_SALDO.some(s => l.descricao.toUpperCase().includes(s))) return;
          
          const date = new Date(l.data);
          const monthName = date.toLocaleString('pt-BR', { month: 'short' });
          const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', '');

          if (!cashFlowMap[capitalizedMonth]) {
            cashFlowMap[capitalizedMonth] = { receita: 0, despesa: 0 };
          }

          if (l.tipo === 'RECEITA') cashFlowMap[capitalizedMonth].receita += Number(l.valor);
          else cashFlowMap[capitalizedMonth].despesa += Number(l.valor);
        });

        // Formatação Final
        setBillingData(
          Object.keys(billingMap)
            .map(key => ({ mes: key, ...billingMap[key] }))
            .sort((a, b) => sortedMonths.indexOf(a.mes) - sortedMonths.indexOf(b.mes))
        );

        setCashFlowData(
          Object.keys(cashFlowMap)
            .map(key => ({ mes: key, ...cashFlowMap[key], saldo: cashFlowMap[key].receita - cashFlowMap[key].despesa }))
            .sort((a, b) => sortedMonths.indexOf(a.mes) - sortedMonths.indexOf(b.mes))
        );

      } catch (err) {
        toast.error('Erro ao buscar os relatórios financeiros');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Métricas de Cobrança
  const billingTotals = useMemo(() => {
    const recebido = billingData.reduce((sum, d) => sum + d.recebido, 0);
    const pendente = billingData.reduce((sum, d) => sum + d.pendente, 0);
    const atrasado = billingData.reduce((sum, d) => sum + d.atrasado, 0);
    return { recebido, pendente, atrasado, total: recebido + pendente + atrasado };
  }, [billingData]);

  // Métricas de Extrato
  const cashFlowTotals = useMemo(() => {
    const receita = cashFlowData.reduce((sum, d) => sum + d.receita, 0);
    const despesa = cashFlowData.reduce((sum, d) => sum + d.despesa, 0);
    return { receita, despesa, saldo: receita - despesa };
  }, [cashFlowData]);

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <DashboardPage>
        <div className="space-y-6 animate-pulse">
          <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl" />)}
          </div>
        </div>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Relatórios de Gestão"
        title="Inteligência financeira em tempo real"
        description="Analise o desempenho de cobrança e o fluxo de caixa real do seu condomínio com dados processados automaticamente."
        status={
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => setActiveTab('cobranca')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'cobranca' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Performance de Cobrança
            </button>
            <button 
              onClick={() => setActiveTab('extrato')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'extrato' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Fluxo de Caixa Real
            </button>
          </div>
        }
        aside={
          <div className="p-5 rounded-[24px] bg-white/80 dark:bg-slate-900/80 border border-white/70 backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Resumo Consolidado 2026</p>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-xs text-slate-500">Eficiência de Cobrança</span>
                <span className="text-sm font-black text-emerald-600">
                  {billingTotals.total > 0 ? ((billingTotals.recebido / billingTotals.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-xs text-slate-500">Saldo Operacional Anual</span>
                <span className={`text-sm font-black ${cashFlowTotals.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  R$ {cashFlowTotals.saldo.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
            <Button variant="primary" size="sm" className="w-full mt-5" onClick={handlePrint}>Gerar Relatório PDF</Button>
          </div>
        }
      />

      {activeTab === 'cobranca' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard title="Total Recebido" value={`R$ ${billingTotals.recebido.toLocaleString('pt-BR')}`} color="emerald" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <StatsCard title="Total Pendente" value={`R$ ${billingTotals.pendente.toLocaleString('pt-BR')}`} color="amber" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <StatsCard title="Total Atrasado" value={`R$ ${billingTotals.atrasado.toLocaleString('pt-BR')}`} color="red" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>} />
          </div>

          <Card gradient>
            <CardHeader>
              <DashboardSectionTitle title="Histórico de Cobrança" description="Distribuição mensal de status de pagamentos." />
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Mês</th>
                      <th className="px-6 py-4 text-right font-bold text-emerald-500 uppercase tracking-widest text-[10px]">Recebido</th>
                      <th className="px-6 py-4 text-right font-bold text-amber-500 uppercase tracking-widest text-[10px]">Pendente</th>
                      <th className="px-6 py-4 text-right font-bold text-red-500 uppercase tracking-widest text-[10px]">Atrasado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billingData.map(d => (
                      <tr key={d.mes} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-900">{d.mes}</td>
                        <td className="px-6 py-4 text-right text-emerald-600 font-medium">R$ {d.recebido.toLocaleString('pt-BR')}</td>
                        <td className="px-6 py-4 text-right text-amber-600 font-medium">R$ {d.pendente.toLocaleString('pt-BR')}</td>
                        <td className="px-6 py-4 text-right text-red-600 font-medium">R$ {d.atrasado.toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard title="Receita Real (Entradas)" value={`R$ ${cashFlowTotals.receita.toLocaleString('pt-BR')}`} color="emerald" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>} />
            <StatsCard title="Despesa Real (Saídas)" value={`R$ ${cashFlowTotals.despesa.toLocaleString('pt-BR')}`} color="red" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" /></svg>} />
            <StatsCard title="Saldo Operacional" value={`R$ ${cashFlowTotals.saldo.toLocaleString('pt-BR')}`} color={cashFlowTotals.saldo >= 0 ? 'blue' : 'red'} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
          </div>

          <Card gradient>
            <CardHeader>
              <DashboardSectionTitle title="Análise de Fluxo Mensal" description="Monitoramento das movimentações reais da conta do condomínio." />
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Mês</th>
                      <th className="px-6 py-4 text-right font-bold text-green-600 uppercase tracking-widest text-[10px]">Entradas</th>
                      <th className="px-6 py-4 text-right font-bold text-red-500 uppercase tracking-widest text-[10px]">Saídas</th>
                      <th className="px-6 py-4 text-right font-bold text-blue-500 uppercase tracking-widest text-[10px]">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cashFlowData.map(d => (
                      <tr key={d.mes} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-900">{d.mes}</td>
                        <td className="px-6 py-4 text-right text-emerald-600 font-medium">+ R$ {d.receita.toLocaleString('pt-BR')}</td>
                        <td className="px-6 py-4 text-right text-red-600 font-medium">- R$ {d.despesa.toLocaleString('pt-BR')}</td>
                        <td className={`px-6 py-4 text-right font-black ${d.saldo >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                          R$ {d.saldo.toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardPage>
  );
}
