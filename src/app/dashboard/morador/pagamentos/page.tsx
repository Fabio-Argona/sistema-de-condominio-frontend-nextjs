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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meus Boletos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gerencie suas cotas condominiais e pagamentos
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
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {boletos.map((boleto) => (
                <div key={boleto.id} className="p-6 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                        {boleto.descricao}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(boleto.status)}>
                        {boleto.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="font-medium mr-1">Vencimento:</span>
                        {new Date(boleto.dataVencimento).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white text-base">
                        R$ {boleto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      
                      {boleto.status === 'PAGO' && boleto.dataPagamento && (
                        <div className="text-emerald-600 dark:text-emerald-400">
                          <span className="font-medium mr-1">Pago em:</span>
                          {new Date(boleto.dataPagamento).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>

                    {/* Código de barras e PDF */}
                    {boleto.status !== 'PAGO' && (
                      <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <code className="text-xs sm:text-sm text-slate-800 dark:text-slate-300 break-all flex-1 font-mono">
                          {boleto.linhaDigitavel || 'Boleto sem código de barras registrado.'}
                        </code>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="shrink-0 flex items-center justify-center gap-2"
                          onClick={() => boleto.pdfBase64 ? abrirPDF(boleto.pdfBase64, boleto.descricao) : toast.error('O síndico não anexou nenhum PDF para este boleto.')}
                          disabled={!boleto.pdfBase64}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Baixar PDF
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
  );
}
