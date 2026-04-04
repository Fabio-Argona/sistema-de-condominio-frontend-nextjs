'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Ocorrencia, Reserva } from '@/types';
import { useApi } from '@/hooks/useApi';

const statusCor: Record<string, 'danger' | 'warning' | 'success' | 'info'> = {
  ABERTA: 'danger',
  EM_ANDAMENTO: 'warning',
  RESOLVIDA: 'success',
  FECHADA: 'info',
};

const fornecedoresMock = [
  { nome: 'Elevadores Atlas', vigencia: '12/2026', contato: '(11) 99880-3001', valor: 'R$ 2.890,00/mês' },
  { nome: 'Portões Alfa', vigencia: '09/2026', contato: '(11) 97721-4421', valor: 'R$ 1.450,00/mês' },
  { nome: 'Bombas Hidrotec', vigencia: '07/2026', contato: '(11) 96610-8892', valor: 'R$ 980,00/mês' },
];

export default function ManutencaoPage() {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { get } = useApi();

  useEffect(() => {
    const load = async () => {
      try {
        const [ocData, reservaData] = await Promise.all([
          get('/ocorrencias') as Promise<Ocorrencia[]>,
          get('/reservas') as Promise<Reserva[]>,
        ]);

        setOcorrencias(ocData || []);
        setReservas(reservaData || []);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumo = useMemo(() => {
    const abertas = ocorrencias.filter((o) => o.status === 'ABERTA').length;
    const andamento = ocorrencias.filter((o) => o.status === 'EM_ANDAMENTO').length;
    const concluidas = ocorrencias.filter((o) => o.status === 'RESOLVIDA' || o.status === 'FECHADA').length;

    const agenda = reservas
      .filter((r) => ['PENDENTE', 'APROVADA'].includes(r.status))
      .sort((a, b) => new Date(`${a.dataReserva}T00:00:00`).getTime() - new Date(`${b.dataReserva}T00:00:00`).getTime())
      .slice(0, 7);

    return { abertas, andamento, concluidas, agenda };
  }, [ocorrencias, reservas]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-6xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-slide-up">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Manutenção e Serviços</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Chamados, agenda preventiva e gestão de fornecedores</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/sindico/ocorrencias"><Button>Novo Chamado</Button></Link>
            <Link href="/dashboard/sindico/agenda"><Button variant="outline">Agenda Completa</Button></Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Pendentes</p><p className="text-3xl font-bold text-rose-600">{resumo.abertas}</p></CardContent></Card>
          <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Em Andamento</p><p className="text-3xl font-bold text-amber-600">{resumo.andamento}</p></CardContent></Card>
          <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Concluídos</p><p className="text-3xl font-bold text-emerald-600">{resumo.concluidas}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card gradient className="xl:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Chamados Abertos Recentes</h2>
                <Link href="/dashboard/sindico/ocorrencias" className="text-sm text-blue-500 hover:text-blue-400 font-medium">Ver todos →</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {ocorrencias
                .filter((o) => o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO')
                .slice(0, 8)
                .map((o) => (
                  <div key={o.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{o.titulo}</p>
                        <p className="text-xs text-slate-500 mt-1">{o.moradorNome} • Apt {o.apartamento}/{o.bloco}</p>
                      </div>
                      <Badge variant={statusCor[o.status] || 'info'} dot>{o.status.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                ))}
              {ocorrencias.filter((o) => o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO').length === 0 && (
                <p className="text-sm text-slate-500">Sem chamados abertos no momento.</p>
              )}
            </CardContent>
          </Card>

          <Card gradient>
            <CardHeader>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Agenda Preventiva</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {resumo.agenda.map((evento) => (
                <div key={evento.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{evento.areaComumNome}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(`${evento.dataReserva}T00:00:00`).toLocaleDateString('pt-BR')} • {evento.horaInicio} às {evento.horaFim}</p>
                  <p className="text-xs text-slate-500">Responsável: {evento.moradorNome}</p>
                </div>
              ))}
              {resumo.agenda.length === 0 && <p className="text-sm text-slate-500">Sem agenda preventiva para os próximos dias.</p>}
            </CardContent>
          </Card>
        </div>

        <Card gradient>
          <CardHeader>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fornecedores e Contratos</h2>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fornecedoresMock.map((fornecedor) => (
              <div key={fornecedor.nome} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{fornecedor.nome}</p>
                <p className="text-xs text-slate-500 mt-1">Vigência: {fornecedor.vigencia}</p>
                <p className="text-xs text-slate-500">Contato: {fornecedor.contato}</p>
                <p className="text-sm font-semibold text-emerald-600 mt-2">{fornecedor.valor}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
