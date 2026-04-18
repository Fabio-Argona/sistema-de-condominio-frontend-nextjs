'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Card, { CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { Fornecedor, FornecedorFormData } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardPage, DashboardHero } from '@/components/layout/RoleDashboard';

const emptyForm: FornecedorFormData = { nome: '', comentario: '', vigencia: '', contato: '', valor: '' };

export default function UsuarioFornecedoresPage() {
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

  const isOwner = (f: Fornecedor) => user && (f.usuarioId ?? f.moradorId) === user.id;

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
        const res = await put(`/fornecedores/usuario/${user.id}/${editingId}`, form);
        if (res !== null) { toast.success('Fornecedor atualizado!'); setIsModalOpen(false); await load(); }
      } else {
        const res = await post(`/fornecedores/usuario/${user.id}`, form);
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
      await del(`/fornecedores/usuario/${user.id}/${deleteId}`);
      toast.success('Fornecedor removido.');
      setIsDeleteOpen(false);
      setDeleteId(null);
      await load();
    } finally {
      setIsDeleting(false);
    }
  };


  // Resumo dos fornecedores
  const resumo = {
    total: fornecedores.length,
    meus: fornecedores.filter(isOwner).length,
    vigentes: fornecedores.filter((f) => f.vigencia).length,
  };

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Fornecedores"
        title="Profissionais e empresas recomendados"
        description="Conheça os parceiros do condomínio, faça buscas e cadastre novas indicações."
        status={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">{resumo.meus} meus</Badge>
            <Badge variant="info">{resumo.total} fornecedores</Badge>
            <Badge variant="info">{resumo.vigentes} vigentes</Badge>
          </div>
        }
        aside={
          <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Nova indicação</p>
            <div className="mt-4">
              <Button onClick={openCreate} className="w-full" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
                Indicar Fornecedor
              </Button>
            </div>
          </div>
        }
      />

        <section className="space-y-4 animate-slide-up">
          <div className="max-w-xl">
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
            <EmptyState
              title={searchTerm ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
              description={searchTerm ? 'Tente ajustar a busca por nome, contato ou período de vigência para localizar outro fornecedor.' : 'Quando novos fornecedores forem cadastrados, eles aparecerão aqui para consulta e gestão.'}
              action={!searchTerm ? <Button onClick={() => setIsModalOpen(true)}>Adicionar fornecedor</Button> : undefined}
            />
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
                        {f.vigencia && (
                          <p className="text-xs text-slate-400">Vigência: {f.vigencia}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{f.comentario}</p>
                    {f.contato && <p className="text-xs text-slate-400">Contato: {f.contato}</p>}
                    <div className="flex gap-2 pt-2">
                      {isOwner(f) && (
                        <Button size="sm" variant="outline" onClick={() => openEdit(f)}>Editar</Button>
                      )}
                      {isOwner(f) && (
                        <Button size="sm" variant="danger" onClick={() => openDelete(f.id)} isLoading={isDeleting && deleteId === f.id}>Excluir</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
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
    </DashboardPage>
  );
}
