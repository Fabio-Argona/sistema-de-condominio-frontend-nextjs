'use client';

import { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Boleto } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function BoletosPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { get, put } = useApi();
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
      const data = await get(`/boletos/morador/${user?.id}`);
      if (data) {
        setBoletos(data as Boleto[]);
      }
    } catch (error) {
      toast.error('Erro ao carregar boletos');
    } finally {
      setIsLoading(false);
    }
  };

  const abrirPDF = (pdfBase64: string, descricao: string) => {
    const link = document.createElement('a');
    link.href = pdfBase64;
    link.download = `Boleto_${descricao.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download do boleto iniciado!');
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

  const statusOrder: Record<string, number> = { VENCIDO: 0, PENDENTE: 1, PAGO: 2 };
  const boletosOrdenados = [...boletosFiltrados].sort((a, b) => {
    const diff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    if (diff !== 0) return diff;
    return new Date(`${b.dataVencimento}T00:00:00`).getTime() - new Date(`${a.dataVencimento}T00:00:00`).getTime();
  });

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-5xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meus Boletos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gerencie suas cotas condominiais e boletos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Histórico e Pendências</h2>
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
              {boletosOrdenados.map((boleto) => (
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
                          onClick={() => boleto.pdfBase64 ? abrirPDF(boleto.pdfBase64, boleto.descricao) : toast.error('O síndico não anexou o PDF deste boleto.')}
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
      </Card>
      </div>
    </div>
  );
}
