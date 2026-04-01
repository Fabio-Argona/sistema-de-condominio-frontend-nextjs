'use client';

import { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import { Morador } from '@/types';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import { formatPhone, formatCPF } from '@/utils/formatters';

interface CriarMoradorResponse {
  morador: Morador;
  conviteEnviado: boolean;
  message: string;
}

export default function MoradoresPage() {
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMorador, setEditingMorador] = useState<Morador | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ 
    nome: '', 
    email: '', 
    cpf: '', 
    telefone: '', 
    apartamento: '', 
    bloco: '' 
  });
  const [sendingInvite, setSendingInvite] = useState<number | null>(null);
  const [moradorToDelete, setMoradorToDelete] = useState<Morador | null>(null);
  
  const { get, post, put, del, patch, isLoading } = useApi<Morador | Morador[] | void | CriarMoradorResponse>();

  const loadMoradores = async () => {
    const data = await get('/moradores') as Morador[];
    if (data) {
      setMoradores(data);
    }
  };

  useEffect(() => {
    loadMoradores();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMoradores = moradores.filter((m) =>
    (m.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.apartamento || '').includes(searchTerm) ||
    (m.bloco || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (morador?: Morador) => {
    if (morador) {
      setEditingMorador(morador);
      setFormData({ 
        nome: morador.nome || '', 
        email: morador.email || '', 
        cpf: morador.cpf || '', 
        telefone: morador.telefone || '', 
        apartamento: morador.apartamento || '', 
        bloco: morador.bloco || '' 
      });
    } else {
      setEditingMorador(null);
      setFormData({ 
        nome: '', 
        email: '', 
        cpf: '', 
        telefone: '', 
        apartamento: '', 
        bloco: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingMorador) {
      const updated = await put(`/moradores/${editingMorador.id}`, formData);
      if (updated) {
        setIsModalOpen(false);
        await loadMoradores();
        toast.success('Dados atualizados com sucesso!');
      }
    } else {
      const result = await post('/moradores', formData) as CriarMoradorResponse;
      if (result) {
        setIsModalOpen(false);
        await loadMoradores();
        setFormData({ nome: '', email: '', cpf: '', telefone: '', apartamento: '', bloco: '' });
        
        if (result.conviteEnviado) {
          toast.success(
            '🎉 Morador cadastrado e convite enviado por e-mail!',
            { duration: 5000, icon: '✉️' }
          );
        } else {
          toast.error(
            'Morador cadastrado, mas houve falha ao enviar o convite. Use "Reenviar Convite".',
            { duration: 6000 }
          );
        }
      }
    }
  };

  const handleReenviarConvite = async (morador: Morador) => {
    setSendingInvite(morador.id);
    try {
      const result = await post(`/moradores/${morador.id}/reenviar-convite`) as { message: string; success: boolean } | null;
      if (result?.success) {
        toast.success(result.message || 'Convite reenviado com sucesso!', { duration: 5000, icon: '✉️' });
      } else {
        toast.error(result?.message || 'Falha ao reenviar convite.');
      }
    } catch {
      toast.error('Erro ao reenviar convite.');
    } finally {
      setSendingInvite(null);
    }
  };

  const handleDeleteClick = (morador: Morador) => {
    setMoradorToDelete(morador);
  };

  const confirmDelete = async () => {
    if (!moradorToDelete) return;
    
    const success = await del(`/moradores/${moradorToDelete.id}`);
    if (success !== null) {
      setMoradores(moradores.filter((m) => m.id !== moradorToDelete.id));
      toast.success('Morador removido com sucesso!');
    }
    setMoradorToDelete(null);
  };

  const handleToggleActive = async (id: number) => {
    const updated = await patch(`/moradores/${id}/status`) as Morador;
    if (updated) {
      setMoradores(moradores.map((m) => m.id === id ? { ...m, ativo: updated.ativo } : m));
      toast.success(updated.ativo ? 'Morador ativado com sucesso!' : 'Morador desativado com sucesso!');
    }
  };

  const columns = [
    { 
      key: 'nome', 
      header: 'Morador',
      render: (m: Morador) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
            {(m.nome || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{m.nome}</p>
            <p className="text-xs text-slate-500">{m.email}</p>
          </div>
        </div>
      ),
    },
    { 
      key: 'apartamento', 
      header: 'Unidade', 
      render: (m: Morador) => <span className="font-medium">Nº {m.apartamento} - {m.bloco}</span> 
    },
    { key: 'telefone', header: 'Telefone', render: (m: Morador) => formatPhone(m.telefone || '') },
    { key: 'cpf', header: 'CPF', render: (m: Morador) => formatCPF(m.cpf || '') },
    {
      key: 'ativo', 
      header: 'Status',
      render: (m: Morador) => (
        <Badge variant={m.ativo ? 'success' : 'danger'} dot>{m.ativo ? 'Ativo' : 'Inativo'}</Badge>
      ),
    },
    {
      key: 'acoes', 
      header: 'Ações',
      render: (m: Morador) => (
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => handleReenviarConvite(m)} 
            disabled={sendingInvite === m.id}
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            title="Reenviar Convite"
          >
            {sendingInvite === m.id ? (
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
          <button onClick={() => handleOpenModal(m)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Editar">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={() => handleToggleActive(m.id)} className={`p-1.5 rounded-lg transition-colors ${m.ativo ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`} title={m.ativo ? 'Desativar' : 'Ativar'}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={m.ativo ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
          </button>
          <button onClick={() => handleDeleteClick(m)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Excluir">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Moradores</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie os moradores do condomínio</p>
        </div>
        <Button onClick={() => handleOpenModal()} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          Cadastrar Morador
        </Button>
      </div>

      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Input
              placeholder="Buscar por nome, unidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Badge variant="info">{filteredMoradores.length} moradores</Badge>
              <Badge variant="success">{filteredMoradores.filter((m) => m.ativo).length} ativos</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredMoradores}
            isLoading={isLoading && moradores.length === 0}
            keyExtractor={(m) => m.id}
            emptyMessage="Nenhum morador encontrado."
          />
        </CardContent>
      </Card>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMorador ? 'Atualizar Morador' : 'Cadastro de Morador'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingMorador && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-700/30">
              <span className="text-xl">📧</span>
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Convite por E-mail</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  Não é necessário criar senha. Uma senha temporária será gerada e enviada automaticamente.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nome completo" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
            <Input label="E-mail" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            <Input label="CPF" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" required mask="cpf" />
            <Input label="Telefone" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} placeholder="(00) 00000-0000" mask="phone" />
            <Input label="Nº Unidade / Casa" value={formData.apartamento} onChange={(e) => setFormData({ ...formData, apartamento: e.target.value })} required />
            <Input label="Bloco / Quadra" value={formData.bloco} onChange={(e) => setFormData({ ...formData, bloco: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isLoading}>Descartar</Button>
            <Button type="submit" disabled={isLoading}>
              {editingMorador ? 'Salvar Mudanças' : 'Confirmar Cadastro'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal isOpen={!!moradorToDelete} onClose={() => setMoradorToDelete(null)} title="Remover Morador" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-600 dark:text-red-400">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-200">Deseja remover {moradorToDelete?.nome}?</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Esta ação removerá o acesso ao portal e apagará seu histórico permanentemente.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setMoradorToDelete(null)} disabled={isLoading}>Manter</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isLoading}>Excluir Agora</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
