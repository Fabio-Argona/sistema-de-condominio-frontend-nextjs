'use client';

import { useEffect, useMemo, useState } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatsCard from '@/components/ui/StatsCard';
import { DashboardActions, DashboardHero, DashboardPage, DashboardSectionTitle } from '@/components/layout/RoleDashboard';
import toast from 'react-hot-toast';
import { Boleto } from '@/types';
import { useApi } from '@/hooks/useApi';

export default function RelatoriosPage() {
  const [periodo] = useState('2026');
  const [monthlyData, setMonthlyData] = useState<{ mes: string, recebido: number, pendente: number, atrasado: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { get } = useApi();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const boletos = await get('/boletos') as Boleto[];
        
        const summaryMap: Record<string, { recebido: number, pendente: number, atrasado: number }> = {};
        
        boletos.forEach(b => {
          // Extrair Mês (Avançando um dia no Date para corrigir o Timezone de datas ISO do banco)
          const date = new Date(new Date(b.dataVencimento).getTime() + 86400000);
          const monthName = date.toLocaleString('pt-BR', { month: 'short' });
          const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', '');
          
          if (!summaryMap[capitalizedMonth]) {
            summaryMap[capitalizedMonth] = { recebido: 0, pendente: 0, atrasado: 0 };
          }
          
          if (b.status === 'PAGO') {
            summaryMap[capitalizedMonth].recebido += b.valor;
          } else if (b.status === 'PENDENTE') {
            summaryMap[capitalizedMonth].pendente += b.valor;
          } else if (b.status === 'VENCIDO') {
            summaryMap[capitalizedMonth].atrasado += b.valor;
          }
        });

        // Ordenar os meses cronologicamente
        const sortedMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        let dataArr = Object.keys(summaryMap)
             .map(key => ({ mes: key, ...summaryMap[key] }))
             .sort((a, b) => sortedMonths.indexOf(a.mes) - sortedMonths.indexOf(b.mes));
             
        if (dataArr.length === 0) {
           dataArr = [{ mes: 'Sem Dados', recebido: 0, pendente: 0, atrasado: 0 }];
        }
        
        setMonthlyData(dataArr);
      } catch {
        toast.error('Erro ao buscar os relatórios financeiros');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportPDF = () => {
    // Usando a funcionalidade nativa de impressão do navegador, que é excelente para gerar PDF
    // Adicionamos um pequeno delay para garantir que a UI esteja pronta
    window.print();
    toast.success('Preparando documento para exportação...');
  };

  const handleExportExcel = () => {
    // Cabeçalhos do Excel
    const headers = ['Mês', 'Recebido (R$)', 'Pendente (R$)', 'Atrasado (R$)', 'Total (R$)'];
    
    // Dados formatados
    const rows = monthlyData.map(d => [
      `${d.mes}/2026`,
      d.recebido.toFixed(2).replace('.', ','),
      d.pendente.toFixed(2).replace('.', ','),
      d.atrasado.toFixed(2).replace('.', ','),
      (d.recebido + d.pendente + d.atrasado).toFixed(2).replace('.', ',')
    ]);

    // Montagem do CSV (Excel entende ';' como separador no Brasil)
    const csvContent = [headers, ...rows]
      .map(e => e.join(';'))
      .join('\n');

    // Blob com BOM (\uFEFF) para forçar o Excel a ler como UTF-8
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Relatorio_Financeiro_Oceano_${periodo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Relatório baixado com sucesso!');
  };

  const totalRecebido = monthlyData.reduce((sum, d) => sum + d.recebido, 0);
  const totalPendente = monthlyData.reduce((sum, d) => sum + d.pendente, 0);
  const totalAtrasado = monthlyData.reduce((sum, d) => sum + d.atrasado, 0);
  const totalGeral = totalRecebido + totalPendente + totalAtrasado;
  const picoMes = useMemo(() => monthlyData.reduce((melhor, atual) => {
    const melhorTotal = melhor.recebido + melhor.pendente + melhor.atrasado;
    const atualTotal = atual.recebido + atual.pendente + atual.atrasado;
    return atualTotal > melhorTotal ? atual : melhor;
  }, monthlyData[0] ?? { mes: 'Sem Dados', recebido: 0, pendente: 0, atrasado: 0 }), [monthlyData]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl w-full"></div>
      </div>
    );
  }

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Relatórios"
        title="Leitura financeira pronta para decisão e exportação"
        description="Consolide recebido, pendente e atrasado em uma visão anual, com base mensal e atalhos para exportar o material em PDF ou planilha."
        status={
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={handleExportPDF} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}>
              Exportar PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}>
              Exportar Excel
            </Button>
          </div>
        }
        aside={
          <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Destaque anual</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">Maior volume</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{picoMes.mes}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">Volume total</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">R$ {totalGeral.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        }
      />

      <DashboardActions
        actions={[
          {
            href: '/dashboard/sindico/financeiro',
            title: 'Visão financeira',
            description: 'Volte ao painel financeiro operacional com inadimplência e saldo do mês.',
            accent: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-slate-900',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 animate-slide-up">
        <StatsCard title="Total recebido" value={`R$ ${totalRecebido.toLocaleString('pt-BR')}`} subtitle="Pagamentos compensados no ano" color="emerald" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatsCard title="Total pendente" value={`R$ ${totalPendente.toLocaleString('pt-BR')}`} subtitle="Ainda dentro do prazo" color="amber" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatsCard title="Total atrasado" value={`R$ ${totalAtrasado.toLocaleString('pt-BR')}`} subtitle="Pressão de inadimplência acumulada" color="red" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>} />
      </div>

      <Card gradient className="animate-slide-up">
        <CardHeader>
          <DashboardSectionTitle title="Receitas por mês" description="Base mensal para recebido, pendente, atrasado e total consolidado." />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mês</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Recebido</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Pendente</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Atrasado</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {monthlyData.map((row) => (
                  <tr key={row.mes} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">{row.mes}/2026</td>
                    <td className="px-6 py-4 text-sm text-right text-emerald-600 dark:text-emerald-400 font-medium">R$ {row.recebido.toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-sm text-right text-amber-600 dark:text-amber-400 font-medium">R$ {row.pendente.toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-sm text-right text-red-600 dark:text-red-400 font-medium">R$ {row.atrasado.toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-slate-900 dark:text-white">R$ {(row.recebido + row.pendente + row.atrasado).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/20">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">Total</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-emerald-600 dark:text-emerald-400">R$ {totalRecebido.toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-amber-600 dark:text-amber-400">R$ {totalPendente.toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-red-600 dark:text-red-400">R$ {totalAtrasado.toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-slate-900 dark:text-white">R$ {(totalRecebido + totalPendente + totalAtrasado).toLocaleString('pt-BR')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card gradient className="animate-slide-up">
        <CardHeader>
          <DashboardSectionTitle title="Gráfico de receitas" description="Distribuição visual do volume mensal por situação de cobrança." />
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-around gap-4 pb-4">
            {monthlyData.map((d) => {
              const maxVal = Math.max(...monthlyData.map((m) => m.recebido + m.pendente + m.atrasado));
              return (
                <div key={d.mes} className="flex flex-col items-center gap-2 flex-1 max-w-24">
                  <div className="w-full flex flex-col gap-0.5" style={{ height: '180px' }}>
                    <div className="w-full bg-emerald-500 rounded-t-lg transition-all duration-500 hover:bg-emerald-400 cursor-pointer" style={{ height: `${(d.recebido / (maxVal || 1)) * 180}px` }} title={`Recebido: R$ ${d.recebido.toLocaleString('pt-BR')}`} />
                    <div className="w-full bg-amber-500 transition-all duration-500 hover:bg-amber-400 cursor-pointer" style={{ height: `${(d.pendente / (maxVal || 1)) * 180}px` }} title={`Pendente: R$ ${d.pendente.toLocaleString('pt-BR')}`} />
                    <div className="w-full bg-red-500 rounded-b-lg transition-all duration-500 hover:bg-red-400 cursor-pointer" style={{ height: `${(d.atrasado / (maxVal || 1)) * 180}px` }} title={`Atrasado: R$ ${d.atrasado.toLocaleString('pt-BR')}`} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{d.mes}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-emerald-500" /><span className="text-xs text-slate-500">Recebido</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-amber-500" /><span className="text-xs text-slate-500">Pendente</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-red-500" /><span className="text-xs text-slate-500">Atrasado</span></div>
          </div>
        </CardContent>
      </Card>
    </DashboardPage>
  );
}
