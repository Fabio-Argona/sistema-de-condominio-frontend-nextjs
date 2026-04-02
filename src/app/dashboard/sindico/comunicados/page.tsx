'use client';

import { useState, useEffect } from 'react';
import Card, { CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Comunicado } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ComunicadosPage() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedComunicado, setSelectedComunicado] = useState<Comunicado | null>(null);
  const [comunicadoToDelete, setComunicadoToDelete] = useState<number | null>(null);
  const [formData, setFormData] = useState({ titulo: '', conteudo: '', categoria: 'Geral', importante: false });
  const { user } = useAuth();
  const { get, post, put, del, isLoading } = useApi<Comunicado | Comunicado[] | void>();

  const loadComunicados = async () => {
    const data = await get('/comunicados') as Comunicado[];
    if (data) setComunicados(data);
  };

  useEffect(() => {
    loadComunicados();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      autor: user?.nome || 'Administração'
    };
    
    if (selectedComunicado) {
       // Edição
       const updated = await put(`/comunicados/${selectedComunicado.id}`, payload) as Comunicado;
       if (updated) {
          setComunicados(comunicados.map(c => c.id === updated.id ? updated : c));
          toast.success('Comunicado atualizado!');
          setIsModalOpen(false);
          setFormData({ titulo: '', conteudo: '', categoria: 'Geral', importante: false });
          setSelectedComunicado(null);
       }
    } else {
       // Criação
       const created = await post('/comunicados', payload) as Comunicado;
       if (created) {
         setComunicados([created, ...comunicados]);
         toast.success('Comunicado publicado!');
         setIsModalOpen(false);
         setFormData({ titulo: '', conteudo: '', categoria: 'Geral', importante: false });
       }
    }
  };

  const handleEdit = (comunicado: Comunicado) => {
    setSelectedComunicado(comunicado);
    setFormData({
      titulo: comunicado.titulo,
      conteudo: comunicado.conteudo,
      categoria: comunicado.categoria || 'Geral',
      importante: comunicado.importante
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setComunicadoToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!comunicadoToDelete) return;
    const success = await del(`/comunicados/${comunicadoToDelete}`);
    if (success !== null) {
      setComunicados(comunicados.filter((c) => c.id !== comunicadoToDelete));
      toast.success('Comunicado excluído com sucesso!');
    }
    setIsDeleteModalOpen(false);
    setComunicadoToDelete(null);
  };

  if (isLoading && comunicados.length === 0) {
    return <div className="space-y-4 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}</div>;
  }

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-5xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Comunicados</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Publique e gerencie comunicados</p>
        </div>
        <Button onClick={() => { setSelectedComunicado(null); setFormData({ titulo: '', conteudo: '', categoria: 'Geral', importante: false }); setIsModalOpen(true); }} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          Novo Comunicado
        </Button>
      </div>

      <div className="space-y-4">
        {comunicados.length === 0 ? (
           <p className="text-slate-500 text-center py-8">Nenhum comunicado encontrado no banco de dados.</p>
        ) : comunicados.map((comunicado, i) => (
          <Card key={comunicado.id} hover gradient className={`animate-slide-up stagger-${i % 5 + 1}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {comunicado.importante && <Badge variant="danger" dot>Importante</Badge>}
                    <Badge variant="info">{comunicado.categoria}</Badge>
                    <span className="text-xs text-slate-400">{comunicado.dataCriacao}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{comunicado.titulo}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{comunicado.conteudo}</p>
                  <p className="text-xs text-slate-400 mt-3">Por: {comunicado.autor}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleEdit(comunicado)} className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Editar">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(comunicado.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Excluir">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Novo/Editar Comunicado */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedComunicado ? "Editar Comunicado" : "Novo Comunicado"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Título" name="titulo" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} required placeholder="Título do comunicado" />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Conteúdo</label>
            <textarea name="conteudo" value={formData.conteudo} onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })} required rows={5} placeholder="Escreva o comunicado..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Categoria" name="categoria" value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} placeholder="Ex: Manutenção, Lazer..." />
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.importante} onChange={(e) => setFormData({ ...formData, importante: e.target.checked })} className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500/50" />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Marcar como importante</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{selectedComunicado ? 'Salvar Alterações' : 'Publicar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Excluir Comunicado" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-3">
             <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg text-red-600 dark:text-red-400 shrink-0">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <div>
               <p className="text-sm font-bold text-red-800 dark:text-red-200">Deseja excluir este comunicado?</p>
               <p className="text-xs text-red-600 dark:text-red-400 mt-1">Essa ação é irreversível.</p>
             </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmDelete} isLoading={isLoading}>Excluir Agora</Button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
}
