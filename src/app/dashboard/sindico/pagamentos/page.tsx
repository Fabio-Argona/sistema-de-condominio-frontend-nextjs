'use client';

import { useState, useEffect, useMemo } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { Boleto, Morador } from '@/types';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';

// Força o Next.js a usar a mesmíssima versão do worker que você instalou para não dar incompatibilidade
if (typeof window !== 'undefined') {
  const isNovo = parseInt(pdfjsLib.version.split('.')[0], 10) >= 4;
  // cdnjs parou na versão 4.x, então mudamos pro JSDelivr que puxa direto do NPM (a sua é 5.6.x)
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.${isNovo ? 'mjs' : 'js'}`;
}

export default function GestaoPagamentosPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // States para Emissão de Boleto Avulso
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [moradoresList, setMoradoresList] = useState<{value: string, label: string}[]>([]);
  const [novoBoletoForm, setNovoBoletoForm] = useState({ 
    moradorId: '', 
    descricao: '', 
    valor: '', 
    dataVencimento: '',
    pdfBase64: '' 
  });
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { get, post, del, put } = useApi();

  useEffect(() => {
    loadBoletos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBoletos = async () => {
    setIsLoading(true);
    try {
      const data = await get('/boletos');
      if (data) setBoletos(data as Boleto[]);
    } catch (error) {
      toast.error('Erro ao carregar os boletos');
    } finally {
      setIsLoading(false);
    }
  };

  const abrirModalEmissao = async () => {
    setIsModalOpen(true);
    // Carregar moradores para o Select, se ainda não carregou
    if (moradoresList.length === 0) {
      try {
        const data = await get('/moradores') as Morador[];
        if (data) {
           setMoradoresList(data.map(m => ({ value: m.id.toString(), label: m.nome })));
        }
      } catch (error) {
        toast.error('Erro ao buscar lista de moradores');
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       if (file.type !== 'application/pdf') {
          toast.error('Por favor, selecione apenas arquivos PDF.');
          return;
       }
       if (file.size > 2 * 1024 * 1024) { // 2MB max
          toast.error('O PDF deve ter no máximo 2MB.');
          return;
       }
       setNomeArquivo(file.name);
       const reader = new FileReader();
       reader.onloadend = async () => {
         const base64String = reader.result as string;
         setNovoBoletoForm(prev => ({ ...prev, pdfBase64: base64String }));
         
         // Início da Inteligência: Lendo PDF Dinamicamente
         try {
            toast.loading('Lendo PDF com Inteligência Artificial...', { id: 'pdf-leitura' });
            const base64Data = base64String.split(',')[1];
            const binaryString = window.atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const loadingTask = pdfjsLib.getDocument({ data: bytes });
            const pdfDocument = await loadingTask.promise;
            let textCompleto = '';
            
            for (let i = 1; i <= pdfDocument.numPages; i++) {
              const page = await pdfDocument.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              textCompleto += pageText + ' ';
            }

            // Encontrar Data (DD/MM/YYYY)
            const dataMatch = textCompleto.match(/(\d{2}\/\d{2}\/\d{4})/);
            let dataEncontrada = null;
            if (dataMatch) {
              const [dia, mes, ano] = dataMatch[1].split('/');
              dataEncontrada = `${ano}-${mes}-${dia}`;
            }

            // Encontrar Maior Valor (Ex: 1.500,00 ou 500,00)
            const valoresEncontrados = textCompleto.match(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g);
            let valorMaximo = null;
            if (valoresEncontrados && valoresEncontrados.length > 0) {
              let arrayNumeros = valoresEncontrados.map(v => parseFloat(v.replace(/\./g, '').replace(',', '.')));
              let maximo = Math.max(...arrayNumeros); 
              if (maximo > 0) {
                 valorMaximo = maximo.toString();
              }
            }

            // Tentar descobrir quem é o Morador (Procurar o nome dele no meio do PDF)
            let moradorDetectadoId = null;
            if (moradoresList.length > 0) {
               // Limpa acentos e converte tudo pra minúsculo para a busca não falhar
               const textoSuperLimpo = textCompleto.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
               for (const morador of moradoresList) {
                  const nomeLimpo = morador.label.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
                  if (textoSuperLimpo.includes(nomeLimpo)) {
                     moradorDetectadoId = morador.value;
                     break; // Achamos o dono!
                  }
               }
            }

            if (dataEncontrada || valorMaximo || moradorDetectadoId) {
               setNovoBoletoForm((prev) => ({ 
                  ...prev, 
                  moradorId: moradorDetectadoId || prev.moradorId,
                  descricao: prev.descricao ? prev.descricao : 'Taxa Condominial',
                  dataVencimento: dataEncontrada || prev.dataVencimento, 
                  valor: valorMaximo || prev.valor 
               }));
               toast.success('Pronto! O sistema puxou Valor, Data, Nome e Descrição p/ você.', { id: 'pdf-leitura', duration: 4000 });
            } else {
               toast.success('Boleto anexado. Mas não consegui ler os dados 100%.', { id: 'pdf-leitura' });
            }
         } catch (error) {
            console.error("Erro ao ler PDF", error);
            toast.dismiss('pdf-leitura');
         }
       };
       reader.readAsDataURL(file);
    }
  };

  const abrirPDF = (pdfBase64: string, descricao: string, moradorNome: string) => {
    const link = document.createElement('a');
    link.href = pdfBase64;
    link.download = `Boleto_${descricao.replace(/\s+/g, '_')}_${moradorNome.replace(/\s+/g, '')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download do boleto iniciado!');
  };

  const handleEmitirBoleto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoBoletoForm.moradorId || !novoBoletoForm.valor || !novoBoletoForm.descricao || !novoBoletoForm.dataVencimento) {
       toast.error('Preencha todos os campos!');
       return;
    }
    if (!novoBoletoForm.pdfBase64) {
       toast.error('Você precisa anexar o PDF original do boleto!');
       return;
    }
    
    setIsSubmitting(true);
    try {
       await post('/boletos', {
         moradorId: parseInt(novoBoletoForm.moradorId),
         valor: parseFloat(novoBoletoForm.valor),
         descricao: novoBoletoForm.descricao,
         dataVencimento: novoBoletoForm.dataVencimento,
         pdfBase64: novoBoletoForm.pdfBase64,
         // Linha digitável falsa padrão p/ teste, pois o real ta no PDF
         linhaDigitavel: 'PDF Anexado (Ver arquivo)'
       });
       
       toast.success('Boleto emitido com sucesso!');
       setIsModalOpen(false);
       setNovoBoletoForm({ moradorId: '', descricao: '', valor: '', dataVencimento: '', pdfBase64: '' });
       setNomeArquivo('');
       loadBoletos(); // Atualiza a tabela
    } catch (error) {
       toast.error('Erro ao emitir boleto.');
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleMarcarPago = async (id: number) => {
    if (window.confirm("Dar baixa neste boleto? Tem certeza que o pagamento foi recebido? O status dele mudará para PAGO de forma permanente.")) {
      try {
        await put(`/boletos/${id}/pagar`, {});
        toast.success("Boleto baixado com sucesso! Recebimento confirmado.");
        loadBoletos(); // Atualiza a tabela
      } catch (error) {
        toast.error("Erro ao registrar pagamento.");
      }
    }
  };

  const handleDeleteBoleto = async (id: number) => {
    if (window.confirm("Atenção! Ter certeza que deseja APAGAR este boleto do sistema? Tem certeza?")) {
      try {
        await del(`/boletos/${id}`);
        toast.success("Boleto excluído para sempre!");
        loadBoletos(); // Atualiza a tabela
      } catch (error) {
        toast.error("Erro ao excluir boleto.");
      }
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PAGO': return 'success';
      case 'PENDENTE': return 'warning';
      case 'VENCIDO': return 'danger';
      default: return 'default';
    }
  };

  const statusOptions = [
    { value: 'PENDENTE', label: 'Pendente' },
    { value: 'PAGO', label: 'Pago' },
    { value: 'VENCIDO', label: 'Vencido' },
  ];

  const filteredBoletos = useMemo(() => {
    return boletos.filter((b) => {
      const matchSearch = b.moradorNome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === '' || b.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [boletos, searchTerm, statusFilter]);

  const columns = [
    {
      key: 'morador',
      header: 'Morador',
      render: (b: Boleto) => (
         <div className="font-medium text-slate-900 dark:text-white">
           {b.moradorNome || `Morador #${b.moradorId}`}
         </div>
      ),
    },
    {
      key: 'descricao',
      header: 'Descrição',
      render: (b: Boleto) => b.descricao,
    },
    {
      key: 'valor',
      header: 'Valor',
      render: (b: Boleto) => (
         <span className="font-semibold text-slate-900 dark:text-slate-100">
           R$ {b.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
         </span>
      ),
    },
    {
      key: 'dataVencimento',
      header: 'Vencimento',
      render: (b: Boleto) => new Date(b.dataVencimento).toLocaleDateString('pt-BR'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b: Boleto) => (
        <Badge variant={getStatusBadgeVariant(b.status)} size="sm">
          {b.status}
        </Badge>
      ),
    },
    {
      key: 'acoes',
      header: '',
      className: 'text-right min-w-[250px]', // Mantém o cabeçalho espaçoso para caber 3 botões
      render: (b: Boleto) => (
        <div className="flex justify-end gap-2 flex-wrap">
           {b.status !== 'PAGO' && (
             <Button
                size="sm"
                onClick={() => handleMarcarPago(b.id)}
                title="Sinalizar que morador pagou este boleto"
                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:text-emerald-400 font-medium shrink-0"
             >
                Dar Baixa
             </Button>
           )}
           <Button 
             variant="outline" 
             size="sm" 
             onClick={() => handleDeleteBoleto(b.id)}
             title="Apagar Boleto"
             className="!text-red-600 !border-red-200 hover:!bg-red-50 dark:!text-red-400 dark:hover:!bg-red-500/10 dark:!border-red-500/30 shrink-0"
           >
             Excluir
           </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão Financeira</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe o pagamento das cotas condominiais e gere cobranças.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={abrirModalEmissao}>
            Emitir Boleto Avulso
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Relatório de Emissões</h2>
             <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Input
                placeholder="Buscar por morador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64"
              />
              <Select
                 placeholder="Todos os Status"
                 options={statusOptions}
                 value={statusFilter}
                 onChange={(e) => setStatusFilter(e.target.value)}
                 className="w-full sm:w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredBoletos}
            isLoading={isLoading}
            emptyMessage="Nenhum boleto encontrado com os filtros atuais."
            keyExtractor={(b) => b.id}
          />
        </CardContent>
      </Card>
      
      {/* Mini Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-4 rounded-xl">
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Recebidos (Pagos)</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
               {filteredBoletos.filter(b => b.status === 'PAGO').length}
            </p>
         </div>
         <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-xl">
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">A Vencer (Pendentes)</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
               {filteredBoletos.filter(b => b.status === 'PENDENTE').length}
            </p>
         </div>
         <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">Inadimplência (Vencidos)</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">
               {filteredBoletos.filter(b => b.status === 'VENCIDO').length}
            </p>
         </div>
      </div>

      {/* Modal Emissão de Boleto */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Emitir Boleto Avulso">
        <form onSubmit={handleEmitirBoleto} className="space-y-4">
          <Select
            label="Morador Destino"
            options={moradoresList}
            value={novoBoletoForm.moradorId}
            onChange={(e) => setNovoBoletoForm({...novoBoletoForm, moradorId: e.target.value})}
            required
          />
          <Input
            label="Descrição (Serviço/Cota)"
            placeholder="Ex: Cota Extra - Pintura..."
            value={novoBoletoForm.descricao}
            onChange={(e) => setNovoBoletoForm({...novoBoletoForm, descricao: e.target.value})}
            required
            mask="capitalize"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={novoBoletoForm.valor}
              onChange={(e) => setNovoBoletoForm({...novoBoletoForm, valor: e.target.value})}
              required
            />
            <Input
              label="Vencimento"
              type="date"
              value={novoBoletoForm.dataVencimento}
              onChange={(e) => setNovoBoletoForm({...novoBoletoForm, dataVencimento: e.target.value})}
              required
            />
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Anexar Arquivo do Boleto (PDF)
            </label>
            <div className={`
              border-2 border-dashed rounded-xl p-4 text-center transition-colors
              ${novoBoletoForm.pdfBase64 ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800'}
            `}>
               <input
                 type="file"
                 accept="application/pdf"
                 className="hidden"
                 id="pdf-upload"
                 onChange={handleFileChange}
               />
               <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                  {novoBoletoForm.pdfBase64 ? (
                     <>
                        <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">PDF Anexado: {nomeArquivo}</span>
                        <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Clique para alterar</span>
                     </>
                  ) : (
                     <>
                        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Clique para selecionar o PDF original</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Máx: 2MB</span>
                     </>
                  )}
               </label>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t dark:border-slate-700/50">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Emitir Boleto
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
