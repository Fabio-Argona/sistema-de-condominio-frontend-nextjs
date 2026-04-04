'use client';

import { useMemo, useState } from 'react';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface AgendaItem {
  id: number;
  titulo: string;
  tipo: 'Assembleia' | 'Evento' | 'Manutenção';
  data: string;
  horario: string;
  local: string;
}

const agendaInicial: AgendaItem[] = [
  { id: 1, titulo: 'Assembleia Geral Ordinária', tipo: 'Assembleia', data: '2026-04-10', horario: '19:30', local: 'Salão de Festas' },
  { id: 2, titulo: 'Manutenção Preventiva Elevador', tipo: 'Manutenção', data: '2026-04-12', horario: '09:00', local: 'Bloco A' },
  { id: 3, titulo: 'Reunião de Conselho', tipo: 'Assembleia', data: '2026-04-18', horario: '20:00', local: 'Sala de Reuniões' },
  { id: 4, titulo: 'Evento Comunitário Infantil', tipo: 'Evento', data: '2026-04-20', horario: '16:00', local: 'Playground' },
  { id: 5, titulo: 'Inspeção de Bombas', tipo: 'Manutenção', data: '2026-04-23', horario: '08:30', local: 'Casa de Máquinas' },
];

const alertasIniciais = [
  { id: 1, titulo: 'Contrato de limpeza vence em 12 dias', prioridade: 'alta' },
  { id: 2, titulo: 'Prazo legal para prestação de contas: 8 dias', prioridade: 'alta' },
  { id: 3, titulo: 'Renovação AVCB em 35 dias', prioridade: 'media' },
];

const tipoCor: Record<string, 'info' | 'warning' | 'success'> = {
  Assembleia: 'info',
  Manutenção: 'warning',
  Evento: 'success',
};

export default function AgendaPage() {
  const [filtro, setFiltro] = useState<'Todos' | 'Assembleia' | 'Evento' | 'Manutenção'>('Todos');

  const agendaFiltrada = useMemo(() => {
    if (filtro === 'Todos') return agendaInicial;
    return agendaInicial.filter((item) => item.tipo === filtro);
  }, [filtro]);

  const handleEnviarConvites = () => {
    const proximos = [...agendaInicial]
      .sort((a, b) => new Date(`${a.data}T00:00:00`).getTime() - new Date(`${b.data}T00:00:00`).getTime());

    const evento = proximos[0];
    if (!evento) {
      toast.error('Nenhum evento para convite');
      return;
    }

    const dataFmt = new Date(`${evento.data}T00:00:00`).toLocaleDateString('pt-BR');
    const subject = encodeURIComponent(`Convite: ${evento.titulo}`);
    const body = encodeURIComponent(
      `Prezados moradores,%0D%0A%0D%0A` +
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
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-6xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-slide-up">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Agenda do Síndico</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Assembleias, eventos, manutenções e lembretes críticos</p>
          </div>
          <Button variant="outline" onClick={handleEnviarConvites}>Enviar Convites por E-mail</Button>
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
              {agendaFiltrada.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.titulo}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(`${item.data}T00:00:00`).toLocaleDateString('pt-BR')} • {item.horario} • {item.local}</p>
                    </div>
                    <Badge variant={tipoCor[item.tipo]}>{item.tipo}</Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Alertas e Prazos</h2>
              {alertasIniciais.map((alerta) => (
                <div key={alerta.id} className="rounded-xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 p-4">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{alerta.titulo}</p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">Prioridade: {alerta.prioridade}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
