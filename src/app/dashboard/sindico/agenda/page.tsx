'use client';

import { useCallback, useMemo, useState } from 'react';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StatsCard from '@/components/ui/StatsCard';
import EmptyState from '@/components/ui/EmptyState';
import { DashboardHero, DashboardPage, DashboardSectionTitle } from '@/components/layout/RoleDashboard';
import toast from 'react-hot-toast';

interface AgendaItem {
  id: string;
  titulo: string;
  tipo: 'Assembleia' | 'Evento' | 'Manutenção';
  data: string;
  horario: string;
  local: string;
}

interface Alerta {
  id: string;
  titulo: string;
  prioridade: 'alta' | 'media' | 'baixa';
}

const AGENDA_KEY = 'sindico-agenda-v2';
const ALERTAS_KEY = 'sindico-alertas-v2';

const tipoCor: Record<string, 'info' | 'warning' | 'success'> = {
  Assembleia: 'info',
  Manutenção: 'warning',
  Evento: 'success',
};

const eventoVazio = { titulo: '', tipo: 'Assembleia' as AgendaItem['tipo'], data: '', horario: '', local: '' };
const alertaVazio = { titulo: '', prioridade: 'media' as Alerta['prioridade'] };

function loadAgendaInicial(): AgendaItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const agenda = localStorage.getItem(AGENDA_KEY);
    return agenda ? JSON.parse(agenda) as AgendaItem[] : [];
  } catch {
    return [];
  }
}

function loadAlertasIniciais(): Alerta[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const alertas = localStorage.getItem(ALERTAS_KEY);
    return alertas ? JSON.parse(alertas) as Alerta[] : [];
  } catch {
    return [];
  }
}

export default function AgendaPage() {
  const [agenda, setAgenda] = useState<AgendaItem[]>(loadAgendaInicial);
  const [alertas, setAlertas] = useState<Alerta[]>(loadAlertasIniciais);
  const [filtro, setFiltro] = useState<'Todos' | 'Assembleia' | 'Evento' | 'Manutenção'>('Todos');
  const [modalEvento, setModalEvento] = useState(false);
  const [modalAlerta, setModalAlerta] = useState(false);
  const [formEvento, setFormEvento] = useState(eventoVazio);
  const [formAlerta, setFormAlerta] = useState(alertaVazio);

  const salvarAgenda = useCallback((lista: AgendaItem[]) => {
    setAgenda(lista);
    try { localStorage.setItem(AGENDA_KEY, JSON.stringify(lista)); } catch { /* silencioso */ }
  }, []);

  const salvarAlertas = useCallback((lista: Alerta[]) => {
    setAlertas(lista);
    try { localStorage.setItem(ALERTAS_KEY, JSON.stringify(lista)); } catch { /* silencioso */ }
  }, []);

  const agendaFiltrada = useMemo(() => {
    const ordenada = [...agenda].sort(
      (a, b) => new Date(`${a.data}T00:00:00`).getTime() - new Date(`${b.data}T00:00:00`).getTime()
    );
    if (filtro === 'Todos') return ordenada;
    return ordenada.filter((item) => item.tipo === filtro);
  }, [agenda, filtro]);

  const resumo = useMemo(() => ({
    totalEventos: agenda.length,
    assembleias: agenda.filter((item) => item.tipo === 'Assembleia').length,
    manutencoes: agenda.filter((item) => item.tipo === 'Manutenção').length,
    alertasAltos: alertas.filter((alerta) => alerta.prioridade === 'alta').length,
  }), [agenda, alertas]);

  const handleAdicionarEvento = () => {
    if (!formEvento.titulo.trim() || !formEvento.data) {
      toast.error('Preencha título e data');
      return;
    }
    salvarAgenda([...agenda, { ...formEvento, id: Date.now().toString() }]);
    setModalEvento(false);
    setFormEvento(eventoVazio);
    toast.success('Evento adicionado');
  };

  const handleRemoverEvento = (id: string) => {
    salvarAgenda(agenda.filter((a) => a.id !== id));
    toast.success('Evento removido');
  };

  const handleAdicionarAlerta = () => {
    if (!formAlerta.titulo.trim()) {
      toast.error('Informe o título do alerta');
      return;
    }
    salvarAlertas([...alertas, { ...formAlerta, id: Date.now().toString() }]);
    setModalAlerta(false);
    setFormAlerta(alertaVazio);
    toast.success('Alerta adicionado');
  };

  const handleRemoverAlerta = (id: string) => {
    salvarAlertas(alertas.filter((a) => a.id !== id));
    toast.success('Alerta removido');
  };

  const handleEnviarConvites = () => {
    if (agendaFiltrada.length === 0) {
      toast.error('Nenhum evento na agenda');
      return;
    }
    const evento = agendaFiltrada[0];
    const dataFmt = new Date(`${evento.data}T00:00:00`).toLocaleDateString('pt-BR');
    const subject = encodeURIComponent(`Convite: ${evento.titulo}`);
    const body = encodeURIComponent(
      `Prezados usuários,%0D%0A%0D%0A` +
      `Convidamos todos para ${evento.titulo}.%0D%0A` +
      `Data: ${dataFmt}%0D%0A` +
      `Horario: ${evento.horario}%0D%0A` +
      `Local: ${evento.local}%0D%0A%0D%0A` +
      `Atenciosamente,%0D%0ASindicancia`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast.success('Abrindo seu cliente de e-mail');
  };

  return (
    <>
      {/* Modal: Novo Evento */}
      <Modal isOpen={modalEvento} onClose={() => { setModalEvento(false); setFormEvento(eventoVazio); }} title="Novo Evento" size="md">
        <div className="space-y-4 pt-2">
          <Input label="Título" placeholder="Ex: Assembleia Geral" value={formEvento.titulo} onChange={(e) => setFormEvento((p) => ({ ...p, titulo: e.target.value }))} />
          <Select
            label="Tipo"
            name="tipo"
            value={formEvento.tipo}
            onChange={(e) => setFormEvento((p) => ({ ...p, tipo: e.target.value as AgendaItem['tipo'] }))}
            options={[{ value: 'Assembleia', label: 'Assembleia' }, { value: 'Evento', label: 'Evento' }, { value: 'Manutenção', label: 'Manutenção' }]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data" type="date" value={formEvento.data} onChange={(e) => setFormEvento((p) => ({ ...p, data: e.target.value }))} />
            <Input label="Horário" type="time" value={formEvento.horario} onChange={(e) => setFormEvento((p) => ({ ...p, horario: e.target.value }))} />
          </div>
          <Input label="Local" placeholder="Ex: Salão de Festas" value={formEvento.local} onChange={(e) => setFormEvento((p) => ({ ...p, local: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleAdicionarEvento}>Adicionar</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setModalEvento(false); setFormEvento(eventoVazio); }}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Novo Alerta */}
      <Modal isOpen={modalAlerta} onClose={() => { setModalAlerta(false); setFormAlerta(alertaVazio); }} title="Novo Alerta" size="sm">
        <div className="space-y-4 pt-2">
          <Input label="Descrição do Alerta" placeholder="Ex: Contrato de limpeza vence em 12 dias" value={formAlerta.titulo} onChange={(e) => setFormAlerta((p) => ({ ...p, titulo: e.target.value }))} />
          <Select
            label="Prioridade"
            name="prioridade"
            value={formAlerta.prioridade}
            onChange={(e) => setFormAlerta((p) => ({ ...p, prioridade: e.target.value as Alerta['prioridade'] }))}
            options={[{ value: 'alta', label: 'Alta' }, { value: 'media', label: 'Média' }, { value: 'baixa', label: 'Baixa' }]}
          />
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleAdicionarAlerta}>Adicionar</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setModalAlerta(false); setFormAlerta(alertaVazio); }}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <DashboardPage>
        <DashboardHero
          eyebrow="Agenda"
          title="Coordene eventos, manutenções e alertas críticos"
          description="Organize a agenda operacional do condomínio em um único fluxo, com convites rápidos e lembretes para prazos que não podem escapar."
          status={
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={resumo.alertasAltos > 0 ? 'danger' : 'success'} dot>
                {resumo.alertasAltos > 0 ? `${resumo.alertasAltos} alertas de alta prioridade` : 'Sem alertas críticos'}
              </Badge>
              <Badge variant="info">{agendaFiltrada.length} itens no filtro atual</Badge>
            </div>
          }
          aside={
            <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Próximas ações</p>
              <div className="mt-4 space-y-3">
                <Button onClick={() => setModalEvento(true)} className="w-full">+ Evento</Button>
                <Button variant="outline" onClick={handleEnviarConvites} className="w-full">Enviar convites</Button>
              </div>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Eventos" value={resumo.totalEventos} subtitle="Total salvo nesta agenda" color="blue" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 2.25v3m7.5-3v3M3.75 8.25h16.5M4.5 21h15A1.5 1.5 0 0021 19.5v-12A1.5 1.5 0 0019.5 6h-15A1.5 1.5 0 003 7.5v12A1.5 1.5 0 004.5 21z" /></svg>} />
          <StatsCard title="Assembleias" value={resumo.assembleias} subtitle="Reuniões e deliberações" color="indigo" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14.25c3.728 0 6.75-2.35 6.75-5.25S15.728 3.75 12 3.75 5.25 6.1 5.25 9s3.022 5.25 6.75 5.25zm0 0c-3.728 0-6.75 2.35-6.75 5.25h13.5c0-2.9-3.022-5.25-6.75-5.25z" /></svg>} />
          <StatsCard title="Manutenções" value={resumo.manutencoes} subtitle="Intervenções já programadas" color="amber" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 3.158a1.5 1.5 0 012.12 0l7.303 7.303a1.5 1.5 0 010 2.121l-7.303 7.303a1.5 1.5 0 01-2.12 0l-7.303-7.303a1.5 1.5 0 010-2.12l7.303-7.304z" /></svg>} />
          <StatsCard title="Alertas críticos" value={resumo.alertasAltos} subtitle="Demandam atenção imediata" color="red" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm-8.355 2.648h16.71c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L1.913 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
        </div>

          <Card gradient>
            <CardHeader>
              <div className="space-y-4">
                <DashboardSectionTitle title="Agenda operacional" description="Filtre assembleias, eventos e manutenções para priorizar a semana." />
                <div className="flex items-center gap-2 flex-wrap">
                  {(['Todos', 'Assembleia', 'Evento', 'Manutenção'] as const).map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setFiltro(tipo)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filtro === tipo
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-3">
                {agendaFiltrada.length === 0 ? (
                  <EmptyState
                    title="Nenhum evento neste filtro"
                    description="Adicione assembleias, manutenções ou eventos para estruturar a agenda operacional da semana."
                    action={<Button onClick={() => setModalEvento(true)}>+ Evento</Button>}
                  />
                ) : agendaFiltrada.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 relative group">
                    <button
                      onClick={() => handleRemoverEvento(item.id)}
                      className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none"
                      title="Remover evento"
                    >
                      ×
                    </button>
                    <div className="flex items-start justify-between gap-3 pr-5">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.titulo}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(`${item.data}T00:00:00`).toLocaleDateString('pt-BR')}
                          {item.horario && ` • ${item.horario}`}
                          {item.local && ` • ${item.local}`}
                        </p>
                      </div>
                      <Badge variant={tipoCor[item.tipo]}>{item.tipo}</Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <DashboardSectionTitle title="Alertas e prazos" description="Lembretes locais para contratos, vencimentos e tarefas críticas." action={<button onClick={() => setModalAlerta(true)} className="text-xs font-medium text-blue-500 hover:text-blue-400">+ Adicionar</button>} />
                {alertas.length === 0 ? (
                  <EmptyState
                    title="Nenhum alerta cadastrado"
                    description="Crie lembretes para contratos, vencimentos e pendências que não podem sair do radar."
                    action={<Button variant="outline" onClick={() => setModalAlerta(true)}>Criar alerta</Button>}
                  />
                ) : alertas.map((alerta) => (
                  <div key={alerta.id} className="rounded-xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 p-4 relative group">
                    <button
                      onClick={() => handleRemoverAlerta(alerta.id)}
                      className="absolute top-2 right-2 text-amber-300 hover:text-rose-500 dark:text-amber-700 dark:hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none"
                      title="Remover alerta"
                    >
                      ×
                    </button>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 pr-5">{alerta.titulo}</p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1 capitalize">Prioridade: {alerta.prioridade}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
      </DashboardPage>
    </>
  );
}
