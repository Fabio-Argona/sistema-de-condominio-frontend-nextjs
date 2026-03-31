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
  const [selectedComunicado, setSelectedComunicado] = useState<Comunicado | null>(null);
  const [formData, setFormData] = useState({ titulo: '', conteudo: '', categoria: 'Geral', importante: false });
  const { user } = useAuth();
  const { get, post, del, isLoading } = useApi<Comunicado | Comunicado[] | void>();

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
    
    const created = await post('/comunicados', payload) as Comunicado;
    if (created) {
      setComunicados([created, ...comunicados]);
      setIsModalOpen(false);
      setFormData({ titulo: '', conteudo: '', categoria: 'Geral', importante: false });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este comunicado?')) {
      const success = await del(`/comunicados/${id}`);
      if (success !== null) {
        setComunicados(comunicados.filter((c) => c.id !== id));
      }
    }
  };

  if (isLoading && comunicados.length === 0) {
    return <div className="space-y-4 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Comunicados</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Publique e gerencie comunicados</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
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
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{selectedComunicado?.id === comunicado.id ? comunicado.conteudo : comunicado.conteudo.substring(0, 150) + (comunicado.conteudo.length > 150 ? '...' : '')}</p>
                  {comunicado.conteudo.length > 150 && (
                    <button onClick={() => setSelectedComunicado(selectedComunicado?.id === comunicado.id ? null : comunicado)} className="text-sm text-blue-500 hover:text-blue-400 mt-2 font-medium transition-colors">
                      {selectedComunicado?.id === comunicado.id ? 'Ver menos' : 'Ver mais'}
                    </button>
                  )}
                  <p className="text-xs text-slate-400 mt-3">Por: {comunicado.autor}</p>
                </div>
                <button onClick={() => handleDelete(comunicado.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0" title="Excluir">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Comunicado" size="lg">
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
            <Button type="submit" disabled={isLoading}>Publicar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
