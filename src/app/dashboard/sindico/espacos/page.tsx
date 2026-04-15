'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import DataTable from '@/components/ui/DataTable';
import { AreaComum } from '@/types';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import { DashboardPage } from '@/components/layout/RoleDashboard';

export default function EspacosPage() {
  const [areas, setAreas] = useState<AreaComum[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaComum | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    nome: '', 
    descricao: '', 
    capacidade: 0, 
    valorReserva: 0, 
    horarioAbertura: '08:00', 
    horarioFechamento: '22:00',
    disponivel: true,
    regras: ''
  });
  
  const { get, post, put, del, isLoading } = useApi();

  const loadAreas = async () => {
    const data = await get('/areas-comuns') as AreaComum[];
    if (data) setAreas(data);
  };

  useEffect(() => {
    loadAreas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingArea) {
      const updated = await put(`/areas-comuns/${editingArea.id}`, formData) as AreaComum;
      if (updated) {
        setAreas(areas.map((a) => a.id === editingArea.id ? updated : a));
        toast.success('Espaço atualizado com sucesso!');
        handleCloseModal();
      }
    } else {
      const created = await post('/areas-comuns', formData) as AreaComum;
      if (created) {
        setAreas([...areas, created]);
        toast.success('Novo espaço criado!');
        handleCloseModal();
      }
    }
  };

  const handleEdit = (area: AreaComum) => {
    setEditingArea(area);
    setFormData({
      nome: area.nome,
      descricao: area.descricao,
      capacidade: area.capacidade,
      valorReserva: area.valorReserva,
      horarioAbertura: area.horarioAbertura,
      horarioFechamento: area.horarioFechamento,
      disponivel: area.disponivel,
      regras: area.regras || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setAreaToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!areaToDelete) return;
    const success = await del(`/areas-comuns/${areaToDelete}`);
    if (success !== null) {
      setAreas(areas.filter((a) => a.id !== areaToDelete));
      toast.success('Espaço removido com sucesso!');
    }
    setIsDeleteModalOpen(false);
    setAreaToDelete(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingArea(null);
    setFormData({ nome: '', descricao: '', capacidade: 0, valorReserva: 0, horarioAbertura: '08:00', horarioFechamento: '22:00', disponivel: true, regras: '' });
  };

  const columns = [
    { key: 'nome', header: 'Espaço', render: (a: AreaComum) => <span className="font-bold">{a.nome}</span> },
    { key: 'capacidade', header: 'Cap.', render: (a: AreaComum) => <span>{a.capacidade} pessoas</span> },
    { key: 'valor', header: 'Preço', render: (a: AreaComum) => <span>{a.valorReserva > 0 ? `R$ ${a.valorReserva}` : 'Grátis'}</span> },
    { key: 'horario', header: 'Funcionamento', render: (a: AreaComum) => <span>{a.horarioAbertura} às {a.horarioFechamento}</span> },
    { key: 'status', header: 'Status', render: (a: AreaComum) => <Badge variant={a.disponivel ? 'success' : 'danger'}>{a.disponivel ? 'Ativo' : 'Manutenção'}</Badge> },
    {
      key: 'acoes', header: 'Ações',
      render: (a: AreaComum) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleEdit(a)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Editar">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Excluir">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      )
    }
  ];

  return (
    <DashboardPage>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Gerenciar Espaços</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Configure quiosques, piscinas e áreas comuns</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          Novo Espaço
        </Button>
      </div>

      <Card className="animate-slide-up">
        <DataTable columns={columns} data={areas} isLoading={isLoading && areas.length === 0} emptyMessage="Nenhum espaço cadastrado." keyExtractor={(a) => a.id} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingArea ? 'Editar Espaço' : 'Novo Espaço'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome do Espaço" placeholder="Ex: Quiosque 01, Salão Nobre..." value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
          <Input label="Descrição Curta" placeholder="Ex: Quiosque com churrasqueira e freezer" value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} required />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Capacidade (Pessoas)" type="number" value={formData.capacidade} onChange={(e) => setFormData({...formData, capacidade: Number(e.target.value)})} required />
            <Input label="Valor da Reserva (R$)" type="number" value={formData.valorReserva} onChange={(e) => setFormData({...formData, valorReserva: Number(e.target.value)})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Horário de Abertura" type="time" value={formData.horarioAbertura} onChange={(e) => setFormData({...formData, horarioAbertura: e.target.value})} required />
            <Input label="Horário de Fechamento" type="time" value={formData.horarioFechamento} onChange={(e) => setFormData({...formData, horarioFechamento: e.target.value})} required />
          </div>

          <div>
             <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={formData.disponivel} onChange={(e) => setFormData({...formData, disponivel: e.target.checked})} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Espaço Disponível para Reservas</span>
             </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={handleCloseModal}>Cancelar</Button>
            <Button type="submit" isLoading={isLoading}>{editingArea ? 'Salvar Alterações' : 'Criar Espaço'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Remover Espaço" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-3">
             <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-600 dark:text-red-400 shrink-0">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <div>
               <p className="text-sm font-bold text-red-800 dark:text-red-200">Deseja remover este espaço?</p>
               <p className="text-xs text-red-600 dark:text-red-400 mt-1">Todas as reservas futuras vinculadas a este espaço também serão afetadas.</p>
             </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmDelete} isLoading={isLoading}>Remover Espaço</Button>
          </div>
        </div>
      </Modal>
    </DashboardPage>
  );
}
