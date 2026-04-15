'use client';

import { useState, useEffect, useMemo } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import { Usuario, UserRole } from '@/types';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardPage } from '@/components/layout/RoleDashboard';

interface CriarUsuarioResponse {
  usuario: Usuario;
  conviteEnviado: boolean;
  message: string;
}

const roleLabels: Record<UserRole, string> = {
  MORADOR: 'Morador',
  PORTEIRO: 'Porteiro',
  MANTENEDOR: 'Profissional de manutenção',
  SINDICO: 'Síndico',
};

const roleOrder: Record<UserRole, number> = {
  SINDICO: 0,
  MORADOR: 1,
  PORTEIRO: 2,
  MANTENEDOR: 3,
};

const emptyFormData = {
  nome: '',
  email: '',
  cpf: '',
  telefone: '',
  apartamento: '',
  bloco: '',
  role: 'MORADOR' as UserRole,
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formData, setFormData] = useState({ 
    ...emptyFormData,
  });
  const [sendingInvite, setSendingInvite] = useState<number | null>(null);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);
  const [usuarioParaRole, setUsuarioParaRole] = useState<Usuario | null>(null);
  const [novaRole, setNovaRole] = useState('');
  const [senhaConfirmacaoRole, setSenhaConfirmacaoRole] = useState('');
  const [mostrarSenhaConfirmacao, setMostrarSenhaConfirmacao] = useState(false);
  
  const { get, post, put, del, patch, isLoading } = useApi<Usuario | Usuario[] | void | CriarUsuarioResponse>();
  const { user } = useAuth();

  const loadUsuarios = async () => {
    const data = await get('/usuarios') as Usuario[];
    if (data) {
      setUsuarios(data);
    }
  };

  useEffect(() => {
    loadUsuarios();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsuarios = usuarios
    .filter((m) =>
      (m.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.apartamento || '').includes(searchTerm) ||
      (m.bloco || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const roleDiff = roleOrder[a.role || 'MORADOR'] - roleOrder[b.role || 'MORADOR'];
      if (roleDiff !== 0) return roleDiff;
      return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    });

  const paginatedUsuarios = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsuarios.slice(start, start + pageSize);
  }, [currentPage, filteredUsuarios, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredUsuarios.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredUsuarios.length, pageSize]);

  const handleOpenModal = (usuario?: Usuario) => {
    if (usuario) {
      setEditingUsuario(usuario);
      setFormData({ 
        nome: usuario.nome || '', 
        email: usuario.email || '', 
        cpf: usuario.cpf || '', 
        telefone: usuario.telefone || '', 
        apartamento: usuario.apartamento || '', 
        bloco: usuario.bloco || '',
        role: usuario.role || 'MORADOR',
      });
    } else {
      setEditingUsuario(null);
      setFormData(emptyFormData);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUsuario) {
      const updated = await put(`/usuarios/${editingUsuario.id}`, formData);
      if (updated) {
        setIsModalOpen(false);
        await loadUsuarios();
        toast.success('Dados atualizados com sucesso!');
      }
    } else {
      const result = await post('/usuarios', formData) as CriarUsuarioResponse;
      if (result) {
        setIsModalOpen(false);
        await loadUsuarios();
        setFormData(emptyFormData);
        
        if (result.conviteEnviado) {
          toast.success(
            `${roleLabels[formData.role]} cadastrado e convite enviado por e-mail!`,
            { 
              duration: 5000, 
              icon: (
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              ) 
            }
          );
        } else {
          toast.error(
            `${roleLabels[formData.role]} cadastrado, mas houve falha ao enviar o convite. Use "Reenviar Convite".`,
            { duration: 6000 }
          );
        }
      }
    }
  };

  const handleReenviarConvite = async (usuario: Usuario) => {
    setSendingInvite(usuario.id);
    try {
      const result = await post(`/usuarios/${usuario.id}/reenviar-convite`) as { message: string; success: boolean } | null;
      if (result?.success) {
        toast.success(result.message || 'Convite reenviado com sucesso!', { 
          duration: 5000, 
          icon: (
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          ) 
        });
      } else {
        toast.error(result?.message || 'Falha ao reenviar convite.');
      }
    } catch {
      toast.error('Erro ao reenviar convite.');
    } finally {
      setSendingInvite(null);
    }
  };

  const handleDeleteClick = (usuario: Usuario) => {
    setUsuarioToDelete(usuario);
  };

  const confirmDelete = async () => {
    if (!usuarioToDelete) return;
    
    const success = await del(`/usuarios/${usuarioToDelete.id}`);
    if (success !== null) {
      setUsuarios(usuarios.filter((m) => m.id !== usuarioToDelete.id));
      toast.success('Usuário removido com sucesso!');
    }
    setUsuarioToDelete(null);
  };

  const handleRoleChange = async () => {
    if (!usuarioParaRole || !novaRole) return;
    if (novaRole === 'SINDICO' && !senhaConfirmacaoRole.trim()) {
      toast.error('Digite sua senha para confirmar a promoção para síndico.');
      return;
    }

    const updated = await patch(`/usuarios/${usuarioParaRole.id}/role`, {
      role: novaRole,
      senhaConfirmacao: novaRole === 'SINDICO' ? senhaConfirmacaoRole : undefined,
    });
    if (updated !== null) {
      setUsuarios(usuarios.map((m) => m.id === usuarioParaRole.id ? { ...m, role: novaRole as UserRole } : m));
      toast.success('Perfil de acesso alterado com sucesso!');
      setUsuarioParaRole(null);
      setNovaRole('');
      setSenhaConfirmacaoRole('');
      setMostrarSenhaConfirmacao(false);
    }
  };

  const handleToggleActive = async (id: number) => {
    const updated = await patch(`/usuarios/${id}/status`) as Usuario;
    if (updated) {
      setUsuarios(usuarios.map((m) => m.id === id ? { ...m, ativo: updated.ativo } : m));
      toast.success(updated.ativo ? 'Usuário ativado com sucesso!' : 'Usuário desativado com sucesso!');
    }
  };

  const columns = [
    { 
      key: 'nome', 
      header: 'Usuário',
      render: (m: Usuario) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
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
      key: 'role',
      header: 'Perfil',
      render: (m: Usuario) => (
        <Badge variant={m.role === 'SINDICO' ? 'info' : m.role === 'MANTENEDOR' ? 'warning' : m.role === 'PORTEIRO' ? 'danger' : 'success'}>
          {roleLabels[(m.role || 'MORADOR') as UserRole]}
        </Badge>
      ),
    },
    {
      key: 'ativo', 
      header: 'Status',
      render: (m: Usuario) => (
        <Badge variant={m.ativo ? 'success' : 'danger'} dot>{m.ativo ? 'Ativo' : 'Inativo'}</Badge>
      ),
    },
    {
      key: 'ultimoAcesso',
      header: 'Último Acesso',
      render: (m: Usuario) => m.ultimoAcesso ? (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {new Date(m.ultimoAcesso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      ) : (
        <span className="text-xs text-slate-300 italic">Nunca acessou</span>
      ),
    },
    {
      key: 'acoes', 
      header: 'Ações',
      className: 'min-w-[195px]',
      render: (m: Usuario) => (
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
          <button
            onClick={() => { setUsuarioParaRole(m); setNovaRole(m.role || 'MORADOR'); setSenhaConfirmacaoRole(''); setMostrarSenhaConfirmacao(false); }}
            className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
            title="Alterar Perfil"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </button>
          <button onClick={() => handleOpenModal(m)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Editar">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button
            onClick={() => handleToggleActive(m.id)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${m.ativo ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`}
            title={m.ativo ? 'Desativar' : 'Ativar'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={m.ativo ? 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'}
              />
            </svg>
          </button>
          <button
            onClick={() => handleDeleteClick(m)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            title="Excluir"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardPage>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Usuários</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie usuários e profissionais do condomínio</p>
        </div>
        <Button onClick={() => handleOpenModal()} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          Cadastrar Usuário
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
              <Badge variant="info">{filteredUsuarios.length} usuários</Badge>
              <Badge variant="success">{filteredUsuarios.filter((m) => m.ativo).length} ativos</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={paginatedUsuarios}
            isLoading={isLoading && usuarios.length === 0}
            keyExtractor={(m) => m.id}
            emptyMessage="Nenhum usuário encontrado."
          />
          {!isLoading && filteredUsuarios.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredUsuarios.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="usuários"
            />
          )}
        </CardContent>
      </Card>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUsuario ? 'Atualizar Usuário' : 'Cadastro de Usuário'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingUsuario && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-700/30">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
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
            {!editingUsuario && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Perfil inicial</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="MORADOR">Morador</option>
                  <option value="PORTEIRO">Porteiro</option>
                  <option value="MANTENEDOR">Profissional de manutenção</option>
                  <option value="SINDICO">Síndico</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isLoading}>Descartar</Button>
            <Button type="submit" disabled={isLoading}>
              {editingUsuario ? 'Salvar Mudanças' : 'Confirmar Cadastro'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal isOpen={!!usuarioToDelete} onClose={() => setUsuarioToDelete(null)} title="Remover Usuário" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-600 dark:text-red-400">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-200">Deseja remover {usuarioToDelete?.nome}?</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Esta ação removerá o acesso ao portal e apagará seu histórico permanentemente.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setUsuarioToDelete(null)} disabled={isLoading}>Manter</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isLoading}>Excluir Agora</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Alterar Perfil */}
      <Modal isOpen={!!usuarioParaRole} onClose={() => { setUsuarioParaRole(null); setNovaRole(''); setSenhaConfirmacaoRole(''); setMostrarSenhaConfirmacao(false); }} title="Alterar Perfil de Acesso" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Alterar perfil de {usuarioParaRole?.nome}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Esta ação mudará as permissões de acesso deste usuário no sistema.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Novo Perfil de Acesso</label>
            <select
              value={novaRole}
              onChange={(e) => {
                const role = e.target.value;
                setNovaRole(role);
                if (role !== 'SINDICO') {
                  setSenhaConfirmacaoRole('');
                  setMostrarSenhaConfirmacao(false);
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">Selecione um perfil...</option>
              <option value="MORADOR">Morador</option>
              <option value="PORTEIRO">Porteiro</option>
              <option value="MANTENEDOR">Profissional de manutenção</option>
              <option value="SINDICO">Síndico</option>
            </select>
          </div>
          {novaRole === 'SINDICO' && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/30 dark:bg-amber-900/20">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Confirmação de segurança</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Digite sua senha de {user?.nome || 'síndico'} para confirmar a promoção deste usuário a síndico.
              </p>
              <div className="relative">
                <input
                  type={mostrarSenhaConfirmacao ? 'text' : 'password'}
                  value={senhaConfirmacaoRole}
                  onChange={(e) => setSenhaConfirmacaoRole(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenhaConfirmacao((valorAtual) => !valorAtual)}
                  className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {mostrarSenhaConfirmacao ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => { setUsuarioParaRole(null); setNovaRole(''); setSenhaConfirmacaoRole(''); setMostrarSenhaConfirmacao(false); }} disabled={isLoading}>Cancelar</Button>
            <Button onClick={handleRoleChange} disabled={isLoading || !novaRole || (novaRole === 'SINDICO' && !senhaConfirmacaoRole.trim())}>Confirmar Alteração</Button>
          </div>
        </div>
      </Modal>
    </DashboardPage>
  );
}
