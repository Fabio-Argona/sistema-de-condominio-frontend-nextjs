'use client';

import { useEffect, useMemo, useState } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Pagination from '@/components/ui/Pagination';
import StatsCard from '@/components/ui/StatsCard';
import { DashboardHero, DashboardPage, DashboardSectionTitle } from '@/components/layout/RoleDashboard';
import { Boleto } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const STATUS_ORDER: Record<string, number> = { VENCIDO: 0, PENDENTE: 1, PAGO: 2 };

export default function BoletosPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { get, post } = useApi();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      loadBoletos();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadBoletos = async () => {
    setIsLoading(true);
    try {
      const data = await get(`/boletos/usuario/${user?.id}`);
      if (data) {
        setBoletos(data as Boleto[]);
      }
    } catch {
      toast.error('Erro ao carregar boletos');
    } finally {
      setIsLoading(false);
    }
  };

  const iniciarDownloadPDF = (pdfBase64: string, descricao: string) => {
    const link = document.createElement('a');
    link.href = pdfBase64;
    link.download = `Boleto_${descricao.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadBoleto = async (boleto: Boleto) => {
    if (!boleto.pdfBase64) {
      toast.error('O síndico não anexou o PDF deste boleto.');
      return;
    }

    const result = await post(`/boletos/${boleto.id}/registrar-download`, {}, { showErrorToast: false });
    iniciarDownloadPDF(boleto.pdfBase64, boleto.descricao);

    if (result !== null) {
      toast.success('Download do boleto iniciado!');
      return;
    }

    toast('Download iniciado, mas o histórico não foi registrado.');
  };



  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PAGO': return 'success';
      case 'PENDENTE': return 'warning';
      case 'VENCIDO': return 'danger';
      default: return 'default';
    }
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const boletosFiltrados = boletos.filter((b) => {
    if (b.status !== 'PENDENTE') return true; // PAGO e VENCIDO sempre aparecem
    const venc = new Date(`${b.dataVencimento}T00:00:00`);
    const diasAteVencimento = Math.floor((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diasAteVencimento <= 30; // Só mostra pendentes até 30 dias do vencimento
  });

  const boletosOrdenados = useMemo(() => [...boletosFiltrados].sort((a, b) => {
    const diff = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
    if (diff !== 0) return diff;
    return new Date(`${a.dataVencimento}T00:00:00`).getTime() - new Date(`${b.dataVencimento}T00:00:00`).getTime();
  }), [boletosFiltrados]);

  const paginatedBoletos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return boletosOrdenados.slice(start, start + pageSize);
  }, [currentPage, boletosOrdenados, pageSize]);

  const resumo = useMemo(() => {
    const pagos = boletos.filter((boleto) => boleto.status === 'PAGO');
    const vencidos = boletosOrdenados.filter((boleto) => boleto.status === 'VENCIDO');
    const pendentes = boletosOrdenados.filter((boleto) => boleto.status === 'PENDENTE');
    const valorAberto = [...vencidos, ...pendentes].reduce((total, boleto) => total + boleto.valor, 0);

    return {
      pagos: pagos.length,
      vencidos: vencidos.length,
      pendentes: pendentes.length,
      valorAberto,
    };
  }, [boletos, boletosOrdenados]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, boletos.length]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(boletosOrdenados.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [boletosOrdenados.length, currentPage, pageSize]);

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Pagamentos"
        title="Controle das suas cotas e vencimentos"
        description="Veja rapidamente o que está pago, o que vence em breve e o que já exige ação imediata, com download direto do boleto em PDF."
        status={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={resumo.vencidos > 0 ? 'danger' : 'success'} dot>
              {resumo.vencidos > 0 ? `${resumo.vencidos} boletos vencidos` : 'Nenhum boleto vencido'}
            </Badge>
            <Badge variant="info">{boletosOrdenados.length} boletos visíveis</Badge>
          </div>
        }
        aside={
          <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Posição atual</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">Valor em aberto</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">R$ {resumo.valorAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Pendentes" value={resumo.pendentes} subtitle="Boletos a vencer em breve" color="amber" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatsCard title="Vencidos" value={resumo.vencidos} subtitle="Exigem regularização imediata" color="red" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm-8.355 2.648h16.71c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L1.913 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
        <StatsCard title="Pagos" value={resumo.pagos} subtitle="Histórico já conciliado" color="emerald" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatsCard title="Valor em aberto" value={`R$ ${resumo.valorAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} subtitle="Soma de vencidos e pendentes" color="indigo" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>} />
      </div>

      <Card>
        <CardHeader>
          <DashboardSectionTitle title="Histórico e pendências" description="Todos os boletos ordenados por prioridade de pagamento e vencimento." />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : boletos.length === 0 ? (
            <div className="text-center p-12 text-slate-500 dark:text-slate-400 flex flex-col items-center gap-4">
              <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg">Você não tem nenhum boleto registrado no momento.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4 md:p-0 md:divide-y md:divide-slate-100 md:dark:divide-slate-800">
              {paginatedBoletos.map((boleto) => (
                <div 
                  key={boleto.id} 
                  className="p-5 md:p-6 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl md:bg-transparent md:dark:bg-transparent md:border-none md:rounded-none flex flex-col md:flex-row justify-between md:items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 shadow-sm md:shadow-none"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-3 md:mb-2">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight">
                        {boleto.descricao}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(boleto.status)}>
                        {boleto.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-x-8 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500 dark:text-slate-500 text-xs uppercase tracking-wider font-bold">Vencimento</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {new Date(`${boleto.dataVencimento}T00:00:00`).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500 dark:text-slate-500 text-xs uppercase tracking-wider font-bold">Valor</span>
                        <span className="font-black text-slate-900 dark:text-white text-lg">
                          R$ {boleto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      {boleto.status === 'PAGO' && boleto.dataPagamento && (
                        <div className="col-span-2 flex flex-col gap-1 border-t border-emerald-100 dark:border-emerald-900/30 pt-2 mt-1">
                          <span className="text-emerald-600/70 dark:text-emerald-500/70 text-xs uppercase tracking-wider font-bold">Pagamento Confirmado</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            Em {new Date(`${boleto.dataPagamento}T00:00:00`).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Código de barras e PDF */}
                    {boleto.status !== 'PAGO' && (
                      <div className="mt-5 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Código de Barras</span>
                          <code className="text-xs text-slate-700 dark:text-slate-300 break-all font-mono bg-white dark:bg-slate-900 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-800">
                            {boleto.linhaDigitavel || 'Aguardando registro...'}
                          </code>
                        </div>
                        <Button 
                          variant="primary" 
                          size="md"
                          className="w-full flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                          onClick={() => handleDownloadBoleto(boleto)}
                          disabled={!boleto.pdfBase64}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Baixar Boleto (PDF)
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {!isLoading && boletosOrdenados.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={boletosOrdenados.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="boletos"
          />
        )}
      </Card>
    </DashboardPage>
  );
}
