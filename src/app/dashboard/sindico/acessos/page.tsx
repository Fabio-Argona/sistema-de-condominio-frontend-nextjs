'use client';

import { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useApi } from '@/hooks/useApi';
import { LogAcesso } from '@/types';

const roleLabel: Record<string, string> = {
  SINDICO: 'Síndico',
  MORADOR: 'Morador',
  PORTEIRO: 'Porteiro',
};

const roleColor: Record<string, 'purple' | 'blue' | 'green'> = {
  SINDICO: 'purple',
  MORADOR: 'blue',
  PORTEIRO: 'green',
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

  const logsFiltrados = logs.filter(l =>
    l.usuarioNome.toLowerCase().includes(filtro.toLowerCase()) ||
    l.usuarioEmail.toLowerCase().includes(filtro.toLowerCase()) ||
    l.role.toLowerCase().includes(filtro.toLowerCase()) ||
    (l.ip || '').includes(filtro)
  );

  return (
    <div className="w-full flex justify-center bg-slate-50 min-h-screen">
      <div className="w-full max-w-5xl px-4 sm:px-8 py-10 bg-white rounded-2xl shadow-sm border border-slate-100 my-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Log de Acessos</h1>
              <p className="text-sm text-slate-500">Histórico de entradas no portal do condomínio</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {(['SINDICO', 'MORADOR', 'PORTEIRO'] as const).map(role => {
            const count = logs.filter(l => l.role === role).length;
            return (
              <div key={role} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-slate-800">{count}</p>
                <p className="text-xs text-slate-500 mt-1">{roleLabel[role]}</p>
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
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader>{logsFiltrados.length} registro{logsFiltrados.length !== 1 ? 's' : ''}</CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : logsFiltrados.length === 0 ? (
              <p className="text-center text-slate-500 py-10 text-sm">Nenhum acesso registrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuário</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Perfil</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data / Hora</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsFiltrados.map(log => (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-800">{log.usuarioNome}</p>
                          <p className="text-xs text-slate-400">{log.usuarioEmail}</p>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={roleColor[log.role] ?? 'blue'}>
                            {roleLabel[log.role] ?? log.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {formatDataHora(log.dataHora)}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-xs">
                          {log.ip || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
