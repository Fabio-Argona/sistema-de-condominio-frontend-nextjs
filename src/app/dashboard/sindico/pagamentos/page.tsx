'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { Boleto, Usuario } from '@/types';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';
import { DashboardPage, DashboardHero } from '@/components/layout/RoleDashboard';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // States para Emissão de Boleto Avulso
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [usuariosList, setUsuariosList] = useState<{value: string, label: string}[]>([]);
  const [novoBoletoForm, setNovoBoletoForm] = useState({ 
    usuarioId: '', 
    descricao: '', 
    valor: '', 
    dataVencimento: '',
    pdfBase64: '',
    linhaDigitavel: ''
  });
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enviarEmailAutomatico, setEnviarEmailAutomatico] = useState(true);
  
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBoletoId, setSelectedBoletoId] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBoletoId, setEditingBoletoId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ linhaDigitavel: '' });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<number | null>(null);
  
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
    } catch {
      toast.error('Erro ao carregar os boletos');
    } finally {
      setIsLoading(false);
    }
  };

  const abrirModalEmissao = async () => {
    setIsModalOpen(true);
    // Carregar usuarios para o Select, se ainda não carregou
    if (usuariosList.length === 0) {
      try {
        const data = await get('/usuarios') as Usuario[];
        if (data) {
           setUsuariosList(data.map(m => ({ value: m.id.toString(), label: m.nome })));
        }
      } catch {
        toast.error('Erro ao buscar lista de usuários');
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
              const pageText = textContent.items
                .map((item) => ('str' in item ? item.str : ''))
                .join(' ');
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
              const arrayNumeros = valoresEncontrados.map(v => parseFloat(v.replace(/\./g, '').replace(',', '.')));
              const maximo = Math.max(...arrayNumeros); 
              if (maximo > 0) {
                 valorMaximo = maximo.toString();
              }
            }

            // Tentar descobrir quem é o usuario (Procurar o nome dele no meio do PDF)
            let usuarioDetectadoId = null;
            if (usuariosList.length > 0) {
               // Limpa acentos e converte tudo pra minúsculo para a busca não falhar
               const textoSuperLimpo = textCompleto.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
              for (const usuario of usuariosList) {
                const nomeLimpo = usuario.label.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
                  if (textoSuperLimpo.includes(nomeLimpo)) {
                  usuarioDetectadoId = usuario.value;
                     break; // Achamos o dono!
                  }
               }
            }

            // Extrair linha digitável (47 ou 48 dígitos numéricos, com espaços/pontos típicos de boleto)
            let linhaDigitavelEncontrada = null;
            // Padrão: blocos separados por espaços/pontos, total ~47 dígitos
            const linhaMatch = textCompleto.match(/\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14}/) ||
                               textCompleto.match(/\d{4,5}[\s.]\d{4,6}[\s.]\d{4,6}[\s.]\d{4,6}[\s.]\d{4,14}/) ||
                               textCompleto.match(/\b\d{47,48}\b/);
            if (linhaMatch) {
              linhaDigitavelEncontrada = linhaMatch[0].trim();
            }

            if (dataEncontrada || valorMaximo || usuarioDetectadoId || linhaDigitavelEncontrada) {
               setNovoBoletoForm((prev) => ({ 
                  ...prev, 
              usuarioId: usuarioDetectadoId || prev.usuarioId,
                  descricao: prev.descricao ? prev.descricao : 'Taxa Condominial',
                  dataVencimento: dataEncontrada || prev.dataVencimento, 
                  valor: valorMaximo || prev.valor,
                  linhaDigitavel: linhaDigitavelEncontrada || prev.linhaDigitavel
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

  const iniciarDownloadPDF = (pdfBase64: string, descricao: string, usuarioNome: string) => {
    const link = document.createElement('a');
    link.href = pdfBase64;
    link.download = `Boleto_${descricao.replace(/\s+/g, '_')}_${usuarioNome.replace(/\s+/g, '')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadBoleto = async (boleto: Boleto) => {
    if (!boleto.pdfBase64) {
      toast.error('O PDF deste boleto não está disponível.');
      return;
    }

    const result = await post(`/boletos/${boleto.id}/registrar-download`, {}, { showErrorToast: false });
    const nomeUsuario = boleto.usuarioNome ?? boleto.moradorNome ?? `Usuario_${boleto.usuarioId ?? boleto.moradorId}`;
    iniciarDownloadPDF(boleto.pdfBase64, boleto.descricao, nomeUsuario);

    if (result !== null) {
      toast.success('Download do boleto iniciado!');
      return;
    }

    toast('Download iniciado, mas o histórico não foi registrado.');
  };

  const handleEmitirBoleto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoBoletoForm.usuarioId || !novoBoletoForm.valor || !novoBoletoForm.descricao || !novoBoletoForm.dataVencimento) {
       toast.error('Preencha todos os campos!');
       return;
    }
    if (!novoBoletoForm.pdfBase64) {
       toast.error('Você precisa anexar o PDF original do boleto!');
       return;
    }
    
    setIsSubmitting(true);
    try {
       const criado = await post('/boletos', {
         moradorId: parseInt(novoBoletoForm.usuarioId),
         valor: parseFloat(novoBoletoForm.valor),
         descricao: novoBoletoForm.descricao,
         dataVencimento: novoBoletoForm.dataVencimento,
         pdfBase64: novoBoletoForm.pdfBase64,
         linhaDigitavel: novoBoletoForm.linhaDigitavel || ''
       }) as Boleto | null;
       
       toast.success('Boleto emitido com sucesso!');
       setIsModalOpen(false);
      setNovoBoletoForm({ usuarioId: '', descricao: '', valor: '', dataVencimento: '', pdfBase64: '', linhaDigitavel: '' });
       setNomeArquivo('');
       loadBoletos(); // Atualiza a tabela

       // Envio automático opcional, controlado pelo toggle do síndico
       if (enviarEmailAutomatico && criado?.id) {
         const hoje = new Date();
         hoje.setHours(0, 0, 0, 0);
         const venc = new Date(`${criado.dataVencimento}T00:00:00`);
         const isVencido = venc < hoje;

         const endpoint = isVencido
           ? `/boletos/${criado.id}/enviar-cobranca`
           : `/boletos/${criado.id}/enviar-email`;

         const emailResult = await post(endpoint, {}, { showErrorToast: false });
         if (emailResult !== null) {
            const msg = isVencido
              ? 'E-mail de cobrança enviado automaticamente ao usuário!'
              : 'E-mail com boleto enviado automaticamente ao usuário!';
            toast.success(msg, { 
              duration: 4000, 
              icon: (
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              ) 
            });
         }
         // 403/404 silencioso — o síndico pode reenviar manualmente pela tabela
       }
     } catch {
       toast.error('Erro ao emitir boleto.');
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleMarcarPago = (id: number) => {
    setSelectedBoletoId(id);
    setIsPayModalOpen(true);
  };

  const handleConfirmPay = async () => {
    if (!selectedBoletoId) return;
    try {
      await put(`/boletos/${selectedBoletoId}/pagar`, {});
      toast.success("Boleto baixado com sucesso! Recebimento confirmado.");
      setIsPayModalOpen(false);
      setSelectedBoletoId(null);
      loadBoletos();
    } catch {
      toast.error("Erro ao registrar pagamento.");
    }
  };

  const handleDeleteBoleto = (id: number) => {
    setSelectedBoletoId(id);
    setIsDeleteModalOpen(true);
  };

  const handleEditBoleto = (boleto: Boleto) => {
    setEditingBoletoId(boleto.id);
    setEditForm({ linhaDigitavel: boleto.linhaDigitavel || '' });
    setIsEditModalOpen(true);
  };

  const handleConfirmEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBoletoId) return;
    setIsEditSubmitting(true);
    try {
      await put(`/boletos/${editingBoletoId}`, { linhaDigitavel: editForm.linhaDigitavel });
      toast.success('Boleto atualizado com sucesso!');
      setIsEditModalOpen(false);
      setEditingBoletoId(null);
      setEditForm({ linhaDigitavel: '' });
      loadBoletos();
    } catch {
      toast.error('Erro ao atualizar boleto.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleEnviarEmailBoleto = async (boleto: Boleto) => {
    setSendingEmail(boleto.id);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const venc = new Date(`${boleto.dataVencimento}T00:00:00`);
    const isVencido = venc < hoje;

    const endpoint = isVencido
      ? `/boletos/${boleto.id}/enviar-cobranca`
      : `/boletos/${boleto.id}/enviar-email`;

    const result = await post(endpoint, {}, { showErrorToast: false });
    if (result !== null) {
      const msg = isVencido
        ? 'E-mail de cobrança enviado ao usuário!'
        : 'E-mail com boleto enviado ao usuário!';
      toast.success(msg, { 
        icon: (
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        ) 
      });
    } else {
      toast.error('Falha ao enviar e-mail. Verifique se o backend suporta este recurso.');
    }
    setSendingEmail(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedBoletoId) return;
    try {
      await del(`/boletos/${selectedBoletoId}`);
      toast.success("Boleto excluído com sucesso!");
      setIsDeleteModalOpen(false);
      setSelectedBoletoId(null);
      loadBoletos();
    } catch {
      toast.error("Erro ao excluir boleto.");
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
    const statusOrder: Record<string, number> = { VENCIDO: 0, PENDENTE: 1, PAGO: 2 };

    // Para PAGO: manter apenas o mais recente por usuario
    const pagoMaisRecentePorUsuario = new Map<number, Boleto>();
    boletos
      .filter(b => b.status === 'PAGO')
      .sort((a, b) => new Date(`${b.dataVencimento}T00:00:00`).getTime() - new Date(`${a.dataVencimento}T00:00:00`).getTime())
      .forEach(b => {
        const usuarioId = b.usuarioId ?? b.moradorId;
        if (usuarioId !== undefined && !pagoMaisRecentePorUsuario.has(usuarioId)) {
          pagoMaisRecentePorUsuario.set(usuarioId, b);
        }
      });

    const base = boletos.filter(b => {
      const usuarioId = b.usuarioId ?? b.moradorId;
      if (b.status === 'PAGO') {
        return usuarioId !== undefined && pagoMaisRecentePorUsuario.get(usuarioId)?.id === b.id;
      }
      return true;
    });

    return base
      .filter((b) => {
        const nomeUsuario = b.usuarioNome ?? b.moradorNome;
        const matchSearch = nomeUsuario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            b.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === '' || b.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
        if (statusDiff !== 0) return statusDiff;

        const dueDateDiff = new Date(`${a.dataVencimento}T00:00:00`).getTime() - new Date(`${b.dataVencimento}T00:00:00`).getTime();
        if (dueDateDiff !== 0) return dueDateDiff;

        return (a.usuarioNome || a.moradorNome || '').localeCompare(b.usuarioNome || b.moradorNome || '', 'pt-BR');
      });
  }, [boletos, searchTerm, statusFilter]);

  const paginatedBoletos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBoletos.slice(start, start + pageSize);
  }, [currentPage, filteredBoletos, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredBoletos.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredBoletos.length, pageSize]);

  const columns = [
    {
      key: 'usuario',
      header: 'Usuário',
      render: (b: Boleto) => (
         <div className="font-medium text-slate-900 dark:text-white">
           {b.usuarioNome ?? b.moradorNome ?? `Usuário #${b.usuarioId ?? b.moradorId}`}
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
      render: (b: Boleto) => new Date(`${b.dataVencimento}T00:00:00`).toLocaleDateString('pt-BR'),
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
      className: 'md:text-right md:min-w-[300px]',
      render: (b: Boleto) => (
        <div className="flex justify-start md:justify-end items-center gap-2 flex-wrap max-w-full">
           <button
             onClick={() => handleDownloadBoleto(b)}
             disabled={!b.pdfBase64}
             className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
             title="Baixar boleto"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
             </svg>
           </button>
           <button
             onClick={() => handleEnviarEmailBoleto(b)}
             disabled={sendingEmail === b.id}
             className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
             title="Reenviar boleto por e-mail"
           >
             {sendingEmail === b.id ? (
               <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
               </svg>
             ) : (
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
               </svg>
             )}
           </button>
           {/* Editar linha digitável */}
           <button
             onClick={() => handleEditBoleto(b)}
             className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors shrink-0"
             title="Editar linha digitável"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
             </svg>
           </button>
           {/* Dar Baixa */}
           {b.status !== 'PAGO' && (
             <button
               onClick={() => handleMarcarPago(b.id)}
               className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors shrink-0"
               title="Dar baixa (confirmar pagamento)"
             >
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
             </button>
           )}
           {/* Excluir */}
           <button
             onClick={() => handleDeleteBoleto(b.id)}
             className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
             title="Excluir boleto"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
             </svg>
           </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Financeiro"
        title="Gestão de boletos"
        description="Emita, envie e acompanhe o pagamento dos boletos de todos os moradores. Filtre por status, vencimento e unidade para manter a inadimplência sob controle."
        aside={
          <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Ações rápidas</p>
            <div className="mt-4 space-y-2">
              <Button onClick={abrirModalEmissao} className="w-full">
                Anexar Boleto
              </Button>
              <div className="flex gap-2">
                <Link href="/dashboard/sindico/pagamentos/historico" className="flex-1">
                  <Button variant="outline" className="w-full">Histórico</Button>
                </Link>
                <Link href="/dashboard/sindico/pagamentos/downloads" className="flex-1">
                  <Button variant="outline" className="w-full">Downloads</Button>
                </Link>
              </div>
            </div>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Boletos Emitidos</h2>
             <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Input
                placeholder="Buscar por usuário..."
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
            data={paginatedBoletos}
            isLoading={isLoading}
            emptyMessage="Nenhum boleto encontrado com os filtros atuais."
            keyExtractor={(b) => b.id}
          />
          {!isLoading && filteredBoletos.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredBoletos.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="boletos"
            />
          )}
        </CardContent>
      </Card>
      
      {/* Mini Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-4 rounded-xl">
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Boletos Recebidos</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
               {filteredBoletos.filter(b => b.status === 'PAGO').length}
            </p>
         </div>
         <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-xl">
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Boletos Pendentes</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
               {filteredBoletos.filter(b => b.status === 'PENDENTE').length}
            </p>
         </div>
         <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-xl">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">Boletos Vencidos</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300">
               {filteredBoletos.filter(b => b.status === 'VENCIDO').length}
            </p>
         </div>
      </div>

      {/* Modal Emissão de Boleto */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Emitir Boleto Avulso">
        <form onSubmit={handleEmitirBoleto} className="space-y-4">
          <Select
            label="Usuário Destino"
            options={usuariosList}
            value={novoBoletoForm.usuarioId}
            onChange={(e) => setNovoBoletoForm({...novoBoletoForm, usuarioId: e.target.value})}
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

          <Input
            label="Número do Boleto (Linha Digitável)"
            placeholder="Ex: 1234.5678 9012.345678 90123.456789 1 12340000010963"
            value={novoBoletoForm.linhaDigitavel}
            onChange={(e) => setNovoBoletoForm({...novoBoletoForm, linhaDigitavel: e.target.value})}
          />

          <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-900/40">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Enviar e-mail automaticamente após criar</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Quando desativado, o boleto pode ser reenviado manualmente na tabela.</p>
            </div>
            <button
              type="button"
              onClick={() => setEnviarEmailAutomatico((prev) => !prev)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${enviarEmailAutomatico ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              aria-pressed={enviarEmailAutomatico}
              title={enviarEmailAutomatico ? 'Desativar envio automático de e-mail' : 'Ativar envio automático de e-mail'}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${enviarEmailAutomatico ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
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
              Anexar Boleto
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Baixa */}
      <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Confirmar Recebimento do Boleto">
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-600 dark:text-emerald-400">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Confirmar baixa do boleto?</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">O status será alterado para PAGO e o usuário será notificado da quitação.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsPayModalOpen(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConfirmPay}>Confirmar Pagamento</Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Excluir Registro">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-600 dark:text-red-400">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-200">Deseja apagar este boleto?</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Atenção: Esta ação é irreversível e o boleto sumirá do histórico do usuário.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Manter Boleto</Button>
            <Button variant="danger" onClick={handleConfirmDelete}>Sim, Excluir Boleto</Button>
          </div>
        </div>
      </Modal>
      {/* Modal de Edição de Boleto */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Boleto">
        <form onSubmit={handleConfirmEdit} className="space-y-4">
          <Input
            label="Linha Digitável / Código de Barras"
            placeholder="Ex: 1234.5678 9012.345678 90123.456789 1 12340000010963"
            value={editForm.linhaDigitavel}
            onChange={(e) => setEditForm({ linhaDigitavel: e.target.value })}
          />
          <div className="pt-4 flex justify-end gap-3 border-t dark:border-slate-700/50">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={isEditSubmitting}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </DashboardPage>
  );
}
