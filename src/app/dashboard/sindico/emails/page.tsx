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
  SENHA_ALTERADA: 'success',
  CONVITE_MORADOR: 'success',
  NOVA_RESERVA: 'default',
  STATUS_RESERVA: 'default',
};

const iconClassName = 'w-5 h-5';

const TIPO_ICONS: Record<string, React.ReactNode> = {
  ENVIO_BOLETO: (
    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
  COBRANCA_BOLETO_VENCIDO: (
    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  RECUPERACAO_SENHA: (
    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-3A2.25 2.25 0 008.25 5.25V9m7.5 0h.75A2.25 2.25 0 0118.75 11.25v6A2.25 2.25 0 0116.5 19.5h-9A2.25 2.25 0 015.25 17.25v-6A2.25 2.25 0 017.5 9h8.25z" />
    </svg>
  ),
  SENHA_ALTERADA: (
    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m9 0A2.25 2.25 0 0118.75 12.75v5.25A2.25 2.25 0 0116.5 20.25h-9a2.25 2.25 0 01-2.25-2.25v-5.25A2.25 2.25 0 017.5 10.5m9 0h-9m4.5 3.75l1.5 1.5 3-3" />
    </svg>
  ),
  CONVITE_MORADOR: (
    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  NOVA_RESERVA: (
    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  STATUS_RESERVA: (
    <svg className={iconClassName} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m6 2.354c0 4.373-3.438 8.354-8.25 9.896C7.938 20.458 4.5 16.477 4.5 12.104V6.75A1.5 1.5 0 016 5.25c1.757 0 3.43-.514 4.852-1.476l.398-.268a1.5 1.5 0 011.7 0l.398.268A8.25 8.25 0 0018 5.25a1.5 1.5 0 011.5 1.5v5.354z" />
    </svg>
  ),
};

const TIPO_LABELS: Record<string, string> = {
  ENVIO_BOLETO: 'Envio de Boleto',
  COBRANCA_BOLETO_VENCIDO: 'Cobranca - Boleto Vencido',
  RECUPERACAO_SENHA: 'Recuperacao de Senha',
  SENHA_ALTERADA: 'Senha Alterada',
  CONVITE_MORADOR: 'Convite de Morador',
  NOVA_RESERVA: 'Nova Reserva',
  STATUS_RESERVA: 'Status de Reserva',
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
    { value: 'ENVIO_BOLETO', label: TIPO_LABELS.ENVIO_BOLETO },
    { value: 'COBRANCA_BOLETO_VENCIDO', label: TIPO_LABELS.COBRANCA_BOLETO_VENCIDO },
    { value: 'RECUPERACAO_SENHA', label: TIPO_LABELS.RECUPERACAO_SENHA },
    { value: 'SENHA_ALTERADA', label: TIPO_LABELS.SENHA_ALTERADA },
    { value: 'CONVITE_MORADOR', label: TIPO_LABELS.CONVITE_MORADOR },
    { value: 'NOVA_RESERVA', label: TIPO_LABELS.NOVA_RESERVA },
    { value: 'STATUS_RESERVA', label: TIPO_LABELS.STATUS_RESERVA },
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
              <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {TIPO_ICONS[opt.value]}
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{totais[opt.value] || 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                {opt.label}
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
                      <p className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <span className="mt-0.5 shrink-0 text-slate-500 dark:text-slate-400">
                          {TIPO_ICONS[log.tipo] ?? TIPO_ICONS.NOVA_RESERVA}
                        </span>
                        <span>
                          {log.descricao || log.tipoLabel}
                        {log.boletoId && (
                          <span className="ml-1.5 text-xs text-slate-400">(Boleto #{log.boletoId})</span>
                        )}
                        </span>
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
