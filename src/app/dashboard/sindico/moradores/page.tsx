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

export default function MoradoresPage() {
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMorador, setEditingMorador] = useState<Morador | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ nome: '', email: '', cpf: '', telefone: '', apartamento: '', bloco: '', senha: '' });
  
  const { get, post, put, del, patch, isLoading } = useApi<Morador | Morador[] | void>();

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
      setFormData({ nome: morador.nome || '', email: morador.email || '', cpf: morador.cpf || '', telefone: morador.telefone || '', apartamento: morador.apartamento || '', bloco: morador.bloco || '', senha: '' });
    } else {
      setEditingMorador(null);
      setFormData({ nome: '', email: '', cpf: '', telefone: '', apartamento: '', bloco: '', senha: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMorador) {
      const updated = await put(`/moradores/${editingMorador.id}`, formData);
      if (updated) {
        setMoradores(moradores.map((m) => m.id === editingMorador.id ? { ...m, ...formData } : m));
        setIsModalOpen(false);
      }
    } else {
      const created = await post('/moradores', formData) as Morador;
      if (created) {
        setMoradores([...moradores, created]);
        setIsModalOpen(false);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja remover este morador?')) {
      const success = await del(`/moradores/${id}`);
      if (success !== null) {
        setMoradores(moradores.filter((m) => m.id !== id));
      }
    }
  };

  const handleToggleActive = async (id: number) => {
    const updated = await patch(`/moradores/${id}/status`) as Morador;
    if (updated) {
      setMoradores(moradores.map((m) => m.id === id ? { ...m, ativo: updated.ativo } : m));
    }
  };

  const columns = [
    {
      key: 'nome', header: 'Morador',
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
    { key: 'apartamento', header: 'Unidade', render: (m: Morador) => <span className="font-medium">Apt {m.apartamento} - Bloco {m.bloco}</span> },
    { key: 'telefone', header: 'Telefone' },
    {
      key: 'ativo', header: 'Status',
      render: (m: Morador) => (
        <Badge variant={m.ativo ? 'success' : 'danger'} dot>{m.ativo ? 'Ativo' : 'Inativo'}</Badge>
      ),
    },
    {
      key: 'acoes', header: 'Ações',
      render: (m: Morador) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleOpenModal(m)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Editar">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={() => handleToggleActive(m.id)} className={`p-1.5 rounded-lg transition-colors ${m.ativo ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`} title={m.ativo ? 'Desativar' : 'Ativar'}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={m.ativo ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
          </button>
          <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Excluir">
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
          Novo Morador
        </Button>
      </div>

      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Input
              placeholder="Buscar por nome, apartamento ou bloco..."
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
            emptyMessage="Nenhum morador encontrado no banco de dados."
          />
        </CardContent>
      </Card>

      {/* Modal Criar/Editar */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMorador ? 'Editar Morador' : 'Novo Morador'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nome completo" name="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
            <Input label="E-mail" type="email" name="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            <Input label="CPF" name="cpf" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" required />
            <Input label="Telefone" name="telefone" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} placeholder="(00) 00000-0000" required />
            <Input label="Apartamento" name="apartamento" value={formData.apartamento} onChange={(e) => setFormData({ ...formData, apartamento: e.target.value })} required />
            <Input label="Bloco" name="bloco" value={formData.bloco} onChange={(e) => setFormData({ ...formData, bloco: e.target.value })} required />
            {!editingMorador && (
              <Input label="Senha" type="password" name="senha" value={formData.senha} onChange={(e) => setFormData({ ...formData, senha: e.target.value })} required={!editingMorador} className="md:col-span-2" />
            )}
            {editingMorador && (
              <Input label="Alterar Senha (opcional)" type="password" name="senha" value={formData.senha} onChange={(e) => setFormData({ ...formData, senha: e.target.value })} className="md:col-span-2" />
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{editingMorador ? 'Salvar Alterações' : 'Cadastrar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
