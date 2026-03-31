'use client';

import { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import StatsCard from '@/components/ui/StatsCard';
import DataTable from '@/components/ui/DataTable';
import { Visitante } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function PorteiroDashboard() {
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ nome: '', documento: '', telefone: '', apartamento: '', bloco: '', veiculo: '', placaVeiculo: '', observacoes: '' });

  const { get, post, patch, isLoading } = useApi();
  const { user } = useAuth();

  const loadVisitantes = async () => {
    const data = await get('/visitantes') as Visitante[];
    if (data) setVisitantes(data);
  };

  useEffect(() => {
    loadVisitantes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visitantesPresentes = visitantes.filter((v) => !v.dataSaida);
  const visitantesHoje = visitantes.length; // Aqui poderiamos filtrar por data de hoje real

  const filteredVisitantes = visitantes.filter((v) =>
    (v.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (v.moradorNome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (v.apartamento || '').includes(searchTerm)
  );

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const payload = {
        ...formData,
        porteiroNome: user.nome,
        moradorNome: 'Não Identificado' // Aqui poderia puxar o nome do morador no backend
    };
    
    const created = await post('/visitantes', payload) as Visitante;
    if (created) {
        setVisitantes([created, ...visitantes]);
        setIsModalOpen(false);
        setFormData({ nome: '', documento: '', telefone: '', apartamento: '', bloco: '', veiculo: '', placaVeiculo: '', observacoes: '' });
        toast.success('Entrada registrada com sucesso!');
    }
  };

  const handleExit = async (id: number) => {
    const updated = await patch(`/visitantes/${id}/saida`, {}) as Visitante;
    if (updated) {
        setVisitantes(visitantes.map((v) => v.id === id ? updated : v));
        toast.success('Saída registrada!');
    }
  };

  const columns = [
    {
      key: 'nome', header: 'Visitante',
      render: (v: Visitante) => (
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ${v.dataSaida ? 'bg-gradient-to-br from-slate-400 to-slate-500' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
            {v.nome ? v.nome.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{v.nome}</p>
            <p className="text-xs text-slate-500">{v.documento}</p>
          </div>
        </div>
      ),
    },
    { key: 'destino', header: 'Destino', render: (v: Visitante) => <span>Apt {v.apartamento} - Bloco {v.bloco}</span> },
    { key: 'entrada', header: 'Entrada', render: (v: Visitante) => <span className="text-xs">{v.dataEntrada ? new Date(v.dataEntrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span> },
    { key: 'saida', header: 'Saída', render: (v: Visitante) => v.dataSaida ? <span className="text-xs">{new Date(v.dataSaida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span> : <Badge variant="success" dot size="sm">Presente</Badge> },
    { key: 'veiculo', header: 'Veículo', render: (v: Visitante) => v.veiculo ? <span className="text-xs">{v.veiculo} ({v.placaVeiculo})</span> : <span className="text-xs text-slate-400">—</span> },
    {
      key: 'acoes', header: 'Ações',
      render: (v: Visitante) => !v.dataSaida ? (
        <Button size="sm" variant="outline" onClick={() => handleExit(v.id)} disabled={isLoading}>Registrar Saída</Button>
      ) : <span className="text-xs text-slate-400">Finalizado</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Portaria</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Controle de entrada e saída de visitantes</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          Registrar Entrada
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
        <StatsCard title="Visitantes Total" value={visitantesHoje} color="blue" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>} />
        <StatsCard title="Presentes Agora" value={visitantesPresentes.length} color="emerald" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatsCard title="Saídas Registradas" value={visitantes.filter((v) => v.dataSaida).length} color="amber" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>} />
      </div>

      <Card className="animate-slide-up">
        <CardHeader>
          <Input placeholder="Buscar visitante, apto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} />
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={columns} data={filteredVisitantes} isLoading={isLoading && visitantes.length === 0} keyExtractor={(v) => v.id} emptyMessage="Nenhum visitante registrado" />
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Entrada de Visitante" size="lg">
        <form onSubmit={handleEntry} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nome do Visitante" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
            <Input label="Documento (CPF/RG)" value={formData.documento} onChange={(e) => setFormData({ ...formData, documento: e.target.value })} required />
            <Input label="Telefone" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
            <Input label="Apartamento" value={formData.apartamento} onChange={(e) => setFormData({ ...formData, apartamento: e.target.value })} required />
            <Input label="Bloco" value={formData.bloco} onChange={(e) => setFormData({ ...formData, bloco: e.target.value })} required />
            <Input label="Veículo" value={formData.veiculo} onChange={(e) => setFormData({ ...formData, veiculo: e.target.value })} placeholder="Modelo (opcional)" />
            <Input label="Placa" value={formData.placaVeiculo} onChange={(e) => setFormData({ ...formData, placaVeiculo: e.target.value })} placeholder="ABC-1234 (opcional)" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observações</label>
            <textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={2} placeholder="Observações..." className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>Registrar Entrada</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
