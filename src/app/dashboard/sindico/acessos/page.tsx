'use client';

import { useEffect, useMemo, useState } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import { useApi } from '@/hooks/useApi';
import { LogAcesso } from '@/types';
import { DashboardPage, DashboardHero } from '@/components/layout/RoleDashboard';

type GrupoAcesso = {
  key: string;
  usuarioNome: string;
  usuarioEmail: string;
  role: string;
  total: number;
  ultimoAcesso: string;
  paginas: string[];
  logs: LogAcesso[];
};

const roleLabel: Record<string, string> = {
  SINDICO: 'Síndico',
  MORADOR: 'Usuário',
  PORTEIRO: 'Porteiro',
};

const roleColor: Record<string, 'purple' | 'info' | 'success'> = {
  SINDICO: 'purple',
  MORADOR: 'info',
  PORTEIRO: 'success',
};

const pageLabel: Record<string, string> = {
  '/dashboard/sindico': 'Dashboard',
  '/dashboard/sindico/financeiro': 'Financeiro',
  '/dashboard/sindico/manutencao': 'Manutenção',
  '/dashboard/sindico/agenda': 'Agenda',
  '/dashboard/sindico/seguranca': 'Segurança',
  '/dashboard/sindico/pagamentos': 'Pagamentos',
  '/dashboard/sindico/usuarios': 'Usuários',
  '/dashboard/sindico/moradores': 'Usuários',
  '/dashboard/sindico/espacos': 'Espaços',
  '/dashboard/sindico/ocorrencias': 'Ocorrências',
  '/dashboard/sindico/reservas': 'Reservas',
  '/dashboard/sindico/comunicados': 'Comunicados',
  '/dashboard/sindico/relatorios': 'Relatórios',
  '/dashboard/sindico/acessos': 'Histórico de Acesso',
  '/dashboard/sindico/visitantes': 'Visitantes',
  '/dashboard/sindico/consulta': 'Consulta',
  '/dashboard/usuario': 'Dashboard',
  '/dashboard/usuario/pagamentos': 'Pagamentos',
  '/dashboard/usuario/ocorrencias': 'Ocorrências',
  '/dashboard/usuario/reservas': 'Reservas',
  '/dashboard/usuario/comunicados': 'Comunicados',
  '/dashboard/usuario/consulta': 'Consulta',
  '/dashboard/usuario/fornecedores': 'Fornecedores',
  // Compatibilidade com logs antigos antes da migração de rotas.
  '/dashboard/morador': 'Dashboard',
  '/dashboard/morador/pagamentos': 'Pagamentos',
  '/dashboard/morador/ocorrencias': 'Ocorrências',
  '/dashboard/morador/reservas': 'Reservas',
  '/dashboard/morador/comunicados': 'Comunicados',
  '/dashboard/morador/consulta': 'Consulta',
  '/dashboard/porteiro': 'Dashboard',
  '/dashboard/porteiro/visitantes': 'Visitantes',
  '/dashboard/porteiro/consulta': 'Consulta',
  'Login': 'Login',
};

function formatDataHora(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AcessosPage() {
  const [logs, setLogs] = useState<LogAcesso[]>([]);
  const [filtro, setFiltro] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const { get } = useApi();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await get('/log-acessos') as LogAcesso[] | null;
      if (data) setLogs(data);
      setIsLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logsFiltrados = useMemo(() => logs.filter(l =>
    l.usuarioNome.toLowerCase().includes(filtro.toLowerCase()) ||
    l.usuarioEmail.toLowerCase().includes(filtro.toLowerCase()) ||
    l.role.toLowerCase().includes(filtro.toLowerCase()) ||
    (l.ip || '').includes(filtro) ||
    (pageLabel[l.pagina ?? ''] || l.pagina || '').toLowerCase().includes(filtro.toLowerCase())
  ), [filtro, logs]);

  const grupos = useMemo((): GrupoAcesso[] => {
    const map = new Map<string, GrupoAcesso>();

    logsFiltrados.forEach((log) => {
      const key = log.usuarioEmail || `${log.usuarioNome}-${log.role}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          usuarioNome: log.usuarioNome,
          usuarioEmail: log.usuarioEmail,
          role: log.role,
          total: 0,
          ultimoAcesso: log.dataHora,
          paginas: [],
          logs: [],
        });
      }

      const grupo = map.get(key)!;
      grupo.total += 1;
      grupo.logs.push(log);
      if (new Date(log.dataHora) > new Date(grupo.ultimoAcesso)) {
        grupo.ultimoAcesso = log.dataHora;
      }
      const paginaLabel = pageLabel[log.pagina ?? ''] ?? log.pagina;
      if (paginaLabel && !grupo.paginas.includes(paginaLabel)) {
        grupo.paginas.push(paginaLabel);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const roleCompare = (roleLabel[a.role] ?? a.role).localeCompare(roleLabel[b.role] ?? b.role, 'pt-BR');
      if (roleCompare !== 0) {
        return roleCompare;
      }

      return a.usuarioNome.localeCompare(b.usuarioNome, 'pt-BR');
    });
  }, [logsFiltrados]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return grupos.slice(start, start + pageSize);
  }, [currentPage, grupos, pageSize]);

  const resumo = useMemo(() => {
    return logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.role] = (acc[log.role] || 0) + 1;
      return acc;
    }, {});
  }, [logs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtro, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(grupos.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, grupos.length, pageSize]);

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Segurança"
        title="Histórico de acessos"
        description="Visualize e filtre todos os registros de entrada e saída do condomínio. Monitore padrões de acesso por role, bloco ou período."
      />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {(['SINDICO', 'MORADOR', 'PORTEIRO'] as const).map(role => {
            const count = resumo[role] || 0;
            return (
              <div key={role} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{count}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Acessos de {roleLabel[role]}s</p>
              </div>
            );
          })}
        </div>

        {/* Filtro */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Filtrar por nome, e-mail, perfil ou IP..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <span className="text-slate-700 dark:text-slate-200 font-medium">
              {grupos.length} grupo{grupos.length !== 1 ? 's' : ''}
            </span>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : grupos.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400 py-10 text-sm">Nenhum acesso registrado.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedGroups.map((grupo) => (
                  <div key={grupo.key}>
                    <button
                      onClick={() => setExpandedGroup((prev) => (prev === grupo.key ? null : grupo.key))}
                      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4 text-left hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{grupo.usuarioNome}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{grupo.usuarioEmail}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Último acesso: {formatDataHora(grupo.ultimoAcesso)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={roleColor[grupo.role] ?? 'info'}>
                          {roleLabel[grupo.role] ?? grupo.role}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-0.5">
                          {grupo.total} acesso{grupo.total !== 1 ? 's' : ''}
                        </span>
                        {grupo.paginas.slice(0, 2).map((pagina) => (
                          <span key={pagina} className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-0.5">
                            {pagina}
                          </span>
                        ))}
                      </div>
                    </button>

                    {expandedGroup === grupo.key && (
                      <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-700/50">
                              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Data / Hora</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Página</th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">IP</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grupo.logs.map((log) => (
                              <tr key={log.id} className="border-b border-slate-50 dark:border-slate-700/30 last:border-0">
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDataHora(log.dataHora)}</td>
                                <td className="py-3 px-4">
                                  {log.pagina ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-0.5">
                                      {pageLabel[log.pagina] ?? log.pagina}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-slate-400 dark:text-slate-500 font-mono text-xs">{log.ip || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {!isLoading && grupos.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={grupos.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="grupos"
            />
          )}
        </Card>
    </DashboardPage>
  );
}
