'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
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

export default function AgendaPage() {
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [filtro, setFiltro] = useState<'Todos' | 'Assembleia' | 'Evento' | 'Manutenção'>('Todos');
  const [modalEvento, setModalEvento] = useState(false);
  const [modalAlerta, setModalAlerta] = useState(false);
  const [formEvento, setFormEvento] = useState(eventoVazio);
  const [formAlerta, setFormAlerta] = useState(alertaVazio);

  useEffect(() => {
    try {
      const a = localStorage.getItem(AGENDA_KEY);
      if (a) setAgenda(JSON.parse(a));
      const al = localStorage.getItem(ALERTAS_KEY);
      if (al) setAlertas(JSON.parse(al));
    } catch { /* silencioso */ }
  }, []);

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

      <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
        <div className="w-full max-w-6xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-slide-up">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Agenda do Síndico</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Assembleias, eventos, manutenções e lembretes críticos</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setModalEvento(true)}>+ Evento</Button>
              <Button variant="outline" onClick={handleEnviarConvites}>Enviar Convites por E-mail</Button>
            </div>
          </div>

          <Card gradient>
            <CardHeader>
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
            </CardHeader>
            <CardContent className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-3">
                {agendaFiltrada.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">Nenhum evento na agenda. Clique em &quot;+ Evento&quot; para adicionar.</p>
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
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Alertas e Prazos</h2>
                  <button
                    onClick={() => setModalAlerta(true)}
                    className="text-xs text-blue-500 hover:text-blue-400 font-medium"
                  >
                    + Adicionar
                  </button>
                </div>
                {alertas.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum alerta cadastrado.</p>
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
        </div>
      </div>
    </>
  );
}
