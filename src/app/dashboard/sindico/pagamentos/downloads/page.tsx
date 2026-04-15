'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import { useApi } from '@/hooks/useApi';
import { LogDownloadBoleto } from '@/types';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  SINDICO: 'info',
  MORADOR: 'success',
  PORTEIRO: 'warning',
};

type DownloadGroup = {
  key: string;
  usuarioDestinoNome: string;
  logs: LogDownloadBoleto[];
  total: number;
  ultimoDownload: string;
  porRole: Record<string, number>;
};

export default function HistoricoDownloadsBoletosPage() {
  const [logs, setLogs] = useState<LogDownloadBoleto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const { get } = useApi();

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await get('/log-downloads-boletos');
      if (data) {
        setLogs(data as LogDownloadBoleto[]);
      }
    } catch {
      toast.error('Erro ao carregar histórico de downloads');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchRole = roleFilter === '' || log.usuarioRole === roleFilter;
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        term === '' ||
        (log.usuarioNome ?? log.moradorNome).toLowerCase().includes(term) ||
        log.usuarioNome.toLowerCase().includes(term) ||
        log.usuarioEmail.toLowerCase().includes(term) ||
        log.descricaoBoleto.toLowerCase().includes(term);
      return matchRole && matchSearch;
    });
  }, [logs, roleFilter, searchTerm]);

  const filteredGroups = useMemo((): DownloadGroup[] => {
    const map = new Map<string, DownloadGroup>();

    filteredLogs.forEach((log) => {
      const key = `${log.usuarioDestinoId ?? log.moradorId}-${log.usuarioDestinoNome ?? log.moradorNome}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          usuarioDestinoNome: log.usuarioDestinoNome ?? log.moradorNome,
          logs: [],
          total: 0,
          ultimoDownload: log.dataHoraDownload,
          porRole: {},
        });
      }

      const group = map.get(key)!;
      group.logs.push(log);
      group.total += 1;
      group.porRole[log.usuarioRole] = (group.porRole[log.usuarioRole] || 0) + 1;
      if (new Date(log.dataHoraDownload) > new Date(group.ultimoDownload)) {
        group.ultimoDownload = log.dataHoraDownload;
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.usuarioDestinoNome.localeCompare(b.usuarioDestinoNome, 'pt-BR'),
    );
  }, [filteredLogs]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [currentPage, filteredGroups, pageSize]);

  const totais = useMemo(() => {
    const porRole = logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.usuarioRole] = (acc[log.usuarioRole] || 0) + 1;
      return acc;
    }, {});

    return {
      total: logs.length,
      usuarios: porRole.MORADOR || 0,
      sindicos: porRole.SINDICO || 0,
      porteiros: porRole.PORTEIRO || 0,
    };
  }, [logs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, roleFilter, searchTerm]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredGroups.length, pageSize]);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-6xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/dashboard/sindico/pagamentos"
                className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                title="Voltar para pagamentos"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Histórico de Downloads de Boletos</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 ml-7">
              Auditoria de quem baixou cada boleto e em qual momento.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/60">
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Total de downloads</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{totais.total}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 p-4 bg-emerald-50 dark:bg-emerald-900/10">
            <p className="text-xs uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70 font-semibold">Downloads por usuários</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">{totais.usuarios}</p>
          </div>
          <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 p-4 bg-blue-50 dark:bg-blue-900/10">
            <p className="text-xs uppercase tracking-wider text-blue-700/70 dark:text-blue-400/70 font-semibold">Downloads pelo síndico</p>
            <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-400">{totais.sindicos}</p>
          </div>
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 p-4 bg-amber-50 dark:bg-amber-900/10">
            <p className="text-xs uppercase tracking-wider text-amber-700/70 dark:text-amber-400/70 font-semibold">Downloads por porteiros</p>
            <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-400">{totais.porteiros}</p>
          </div>
        </div>

        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="Buscar por usuário, e-mail ou boleto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todos os perfis' },
                  { value: 'MORADOR', label: 'Usuário' },
                  { value: 'SINDICO', label: 'Síndico' },
                  { value: 'PORTEIRO', label: 'Porteiro' },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-white">
              Histórico Agrupado{' '}
              <span className="text-slate-400 font-normal text-sm">
                ({filteredGroups.length} {filteredGroups.length === 1 ? 'usuário' : 'usuários'})
              </span>
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-12 text-slate-400">
                <svg className="w-14 h-14 text-slate-200 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 16.5l4.5-4.5m-4.5 4.5L7.5 12m4.5 4.5V3m-7.5 15.75v.75A2.25 2.25 0 006.75 21h10.5a2.25 2.25 0 002.25-2.25v-.75" />
                </svg>
                <p>Nenhum download encontrado com os filtros selecionados.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedLogs.map((group) => (
                  <div key={group.key}>
                    <button
                      onClick={() => setExpandedGroup((prev) => (prev === group.key ? null : group.key))}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
                    >
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">{group.usuarioDestinoNome}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Último download: {formatDateTime(group.ultimoDownload)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                          {group.total} {group.total === 1 ? 'download' : 'downloads'}
                        </span>
                        {Object.entries(group.porRole)
                          .sort(([, a], [, b]) => b - a)
                          .map(([role, total]) => (
                            <Badge key={role} variant={ROLE_COLORS[role] ?? 'default'} size="sm">
                              {total} {role}
                            </Badge>
                          ))}
                      </div>
                    </button>

                    {expandedGroup === group.key && (
                      <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                        <div className="hidden md:grid grid-cols-[1.4fr_1.2fr_1fr_1fr_0.8fr] gap-4 px-8 py-2.5 text-xs font-bold uppercase text-slate-400 tracking-wider border-b border-slate-100 dark:border-slate-800">
                          <span>Usuário / Boleto</span>
                          <span>Quem baixou</span>
                          <span>Data / Hora</span>
                          <span>Referência</span>
                          <span>Perfil</span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {group.logs.map((log) => (
                            <div
                              key={log.id}
                              className="grid grid-cols-1 md:grid-cols-[1.4fr_1.2fr_1fr_1fr_0.8fr] gap-2 md:gap-4 items-center px-8 py-4"
                            >
                              <div>
                                <p className="font-semibold text-sm text-slate-900 dark:text-white">{log.usuarioDestinoNome ?? log.moradorNome}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{log.descricaoBoleto}</p>
                              </div>

                              <div>
                                <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{log.usuarioNome}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{log.usuarioEmail}</p>
                              </div>

                              <p className="text-sm text-slate-600 dark:text-slate-400">{formatDateTime(log.dataHoraDownload)}</p>

                              <p className="text-sm text-slate-600 dark:text-slate-400">Boleto #{log.boletoId}</p>

                              <Badge variant={ROLE_COLORS[log.usuarioRole] ?? 'default'} size="sm">
                                {log.usuarioRoleLabel}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {!isLoading && filteredGroups.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredGroups.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="grupos"
            />
          )}
        </Card>
      </div>
    </div>
  );
}