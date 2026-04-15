'use client';

import { useState, useEffect, useMemo } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';

interface LogEmail {
  id: number;
  tipo: string;
  tipoLabel: string;
  destinatario: string;
  destinatarioNome: string;
  dataHoraEnvio: string;
  boletoId: number | null;
  descricao: string;
}

const TIPO_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
  ENVIO_BOLETO: 'info',
  COBRANCA_BOLETO_VENCIDO: 'danger',
  RECUPERACAO_SENHA: 'warning',
  CONVITE_MORADOR: 'success',
  NOVA_RESERVA: 'default',
  STATUS_RESERVA: 'default',
};

const TIPO_ICON: Record<string, string> = {
  ENVIO_BOLETO: '💰',
  COBRANCA_BOLETO_VENCIDO: '⚠️',
  RECUPERACAO_SENHA: '🔑',
  CONVITE_MORADOR: '🏠',
  NOVA_RESERVA: '📅',
  STATUS_RESERVA: '✅',
};

export default function HistoricoEmailsPage() {
  const [logs, setLogs] = useState<LogEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');

  const { get } = useApi();

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await get('/log-emails');
      if (data) setLogs(data as LogEmail[]);
    } catch {
      toast.error('Erro ao carregar histórico de e-mails');
    } finally {
      setIsLoading(false);
    }
  };

  const tipoOptions = [
    { value: '', label: 'Todos os tipos' },
    { value: 'ENVIO_BOLETO', label: '💰 Envio de Boleto' },
    { value: 'COBRANCA_BOLETO_VENCIDO', label: '⚠️ Cobrança - Boleto Vencido' },
    { value: 'RECUPERACAO_SENHA', label: '🔑 Recuperação de Senha' },
    { value: 'CONVITE_MORADOR', label: '🏠 Convite de Morador' },
    { value: 'NOVA_RESERVA', label: '📅 Nova Reserva' },
    { value: 'STATUS_RESERVA', label: '✅ Status de Reserva' },
  ];

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchTipo = tipoFilter === '' || l.tipo === tipoFilter;
      const matchSearch =
        searchTerm === '' ||
        l.destinatarioNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.destinatario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchTipo && matchSearch;
    });
  }, [logs, searchTerm, tipoFilter]);

  const totais = useMemo(() => {
    const map: Record<string, number> = {};
    logs.forEach((l) => { map[l.tipo] = (map[l.tipo] || 0) + 1; });
    return map;
  }, [logs]);

  const fmtDt = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-6xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Histórico de E-mails Enviados</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Registro completo de todos os e-mails disparados pelo sistema
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </Button>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {tipoOptions.slice(1).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTipoFilter(tipoFilter === opt.value ? '' : opt.value)}
              className={`text-left p-3 rounded-xl border transition-all ${
                tipoFilter === opt.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              <p className="text-lg mb-1">{TIPO_ICON[opt.value]}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{totais[opt.value] || 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                {opt.label.replace(/^[^\s]+\s/, '')}
              </p>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="Buscar por nome, e-mail ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                options={tipoOptions}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-white">
              Registros{' '}
              <span className="text-slate-400 font-normal text-sm">
                ({filtered.length} {filtered.length === 1 ? 'registro' : 'registros'})
              </span>
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-12 text-slate-400">
                <svg className="w-14 h-14 text-slate-200 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p>Nenhum e-mail encontrado com os filtros selecionados.</p>
              </div>
            ) : (
              <>
                {/* Cabeçalho — desktop */}
                <div className="hidden md:grid grid-cols-[2fr_2fr_2fr_1fr] gap-4 px-6 py-2.5 text-xs font-bold uppercase text-slate-400 tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <span>Destinatário</span>
                  <span>Descrição</span>
                  <span>Data / Hora</span>
                  <span>Tipo</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((log) => (
                    <div
                      key={log.id}
                      className="grid grid-cols-1 md:grid-cols-[2fr_2fr_2fr_1fr] gap-2 md:gap-4 items-center px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Destinatário */}
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">
                          {log.destinatarioNome}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{log.destinatario}</p>
                      </div>

                      {/* Descrição */}
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {TIPO_ICON[log.tipo] ?? '📧'} {log.descricao || log.tipoLabel}
                        {log.boletoId && (
                          <span className="ml-1.5 text-xs text-slate-400">(Boleto #{log.boletoId})</span>
                        )}
                      </p>

                      {/* Data / Hora */}
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="md:hidden text-xs text-slate-400 mr-1">Enviado:</span>
                        {fmtDt(log.dataHoraEnvio)}
                      </p>

                      {/* Badge tipo */}
                      <Badge variant={TIPO_COLORS[log.tipo] ?? 'default'} size="sm">
                        {log.tipoLabel}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
