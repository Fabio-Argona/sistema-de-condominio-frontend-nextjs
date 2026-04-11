'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Card, { CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import { Fornecedor, FornecedorFormData } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';

const emptyForm: FornecedorFormData = { nome: '', comentario: '', vigencia: '', contato: '', valor: '' };

export default function MoradorFornecedoresPage() {
  const { user } = useAuth();
  const { get, post, put, del, isLoading } = useApi();

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // modal criar/editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FornecedorFormData>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // modal confirmar exclusão
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    const data = await get('/fornecedores') as Fornecedor[] | null;
    if (data) setFornecedores(data);
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOwner = (f: Fornecedor) => user && f.moradorId === user.id;

  const filtrados = fornecedores.filter((f) =>
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.comentario || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.contato || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (f: Fornecedor) => {
    setEditingId(f.id);
    setForm({ nome: f.nome, comentario: f.comentario || '', vigencia: f.vigencia || '', contato: f.contato || '', valor: f.valor || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error('Nome é obrigatório.'); return; }
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        const res = await put(`/fornecedores/morador/${user.id}/${editingId}`, form);
        if (res !== null) { toast.success('Fornecedor atualizado!'); setIsModalOpen(false); await load(); }
      } else {
        const res = await post(`/fornecedores/morador/${user.id}`, form);
        if (res !== null) { toast.success('Fornecedor cadastrado!'); setIsModalOpen(false); await load(); }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDelete = (id: number) => { setDeleteId(id); setIsDeleteOpen(true); };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    setIsDeleting(true);
    try {
      await del(`/fornecedores/morador/${user.id}/${deleteId}`);
      toast.success('Fornecedor removido.');
      setIsDeleteOpen(false);
      setDeleteId(null);
      await load();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-5xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">

        <div className="animate-slide-up flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Fornecedores Recomendados</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Profissionais e empresas de confiança do condomínio</p>
          </div>
          <Button variant="primary" onClick={openCreate} className="shrink-0">
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Indicar Fornecedor
          </Button>
        </div>

        <div className="animate-slide-up">
          <Input
            placeholder="Buscar por nome, descrição ou contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-slate-200 dark:bg-slate-700/50 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {searchTerm ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado ainda.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-slide-up">
            {filtrados.map((f) => (
              <Card key={f.id} hover gradient>
                <CardContent className="p-5 space-y-3">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow bg-gradient-to-br ${isOwner(f) ? 'from-emerald-500 to-teal-600' : 'from-blue-500 to-indigo-600'}`}>
                      {f.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{f.nome}</p>
                        {isOwner(f) && <Badge variant="success" size="sm">Meu cadastro</Badge>}
                      </div>
                      {f.valor && (
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{f.valor}</p>
                      )}
                    </div>
                    {/* Action buttons — only owner */}
                    {isOwner(f) && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(f)}
                          title="Editar"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDelete(f.id)}
                          title="Excluir"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Comentário */}
                  {f.comentario && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-l-2 border-blue-200 dark:border-blue-700 pl-3">
                      {f.comentario}
                    </p>
                  )}

                  {/* Detalhes */}
                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                    {f.contato && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {f.contato}
                      </div>
                    )}
                    {f.vigencia && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Contrato vigente até {f.vigencia}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Fornecedor' : 'Indicar Fornecedor'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome *"
            placeholder="Ex: João Eletricista, Limpeza Brilho Total..."
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descrição / O que faz</label>
            <Textarea
              placeholder="Descreva o serviço oferecido, qualidade, experiência..."
              value={form.comentario}
              onChange={(e) => setForm({ ...form, comentario: e.target.value })}
              rows={3}
            />
          </div>
          <Input
            label="Contato (telefone / e-mail / WhatsApp)"
            placeholder="(11) 99999-9999"
            value={form.contato}
            onChange={(e) => setForm({ ...form, contato: e.target.value })}
          />
          <Input
            label="Valor / Faixa de preço"
            placeholder="Ex: R$ 150/visita, A combinar..."
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
          />
          <Input
            label="Vigência do contrato"
            placeholder="Ex: até 12/2026"
            value={form.vigencia}
            onChange={(e) => setForm({ ...form, vigencia: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmar exclusão */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirmar exclusão"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">Tem certeza que deseja remover este fornecedor? Esta ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Removendo...' : 'Remover'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
