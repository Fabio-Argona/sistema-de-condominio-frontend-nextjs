'use client';

import { useState, useEffect } from 'react';
import Card, { CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import { Usuario } from '@/types';
import { useApi } from '@/hooks/useApi';
import { DashboardPage, DashboardHero } from '@/components/layout/RoleDashboard';

export default function UsuarioConsultaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const { get, isLoading } = useApi();

  useEffect(() => {
    const fetchUsuarios = async () => {
      const data = await get('/usuarios') as Usuario[];
      if (data) {
        setUsuarios(data.filter((usuario) => usuario.ativo));
      }
    };
    fetchUsuarios();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsuarios = searchTerm.length >= 1
    ? usuarios.filter((usuario) =>
        (usuario.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (usuario.apartamento || '').includes(searchTerm) ||
        (usuario.bloco?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      )
    : usuarios;

  const usuariosOrdenados = [...filteredUsuarios].sort((a, b) =>
    (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
  );

  // Resumo dos usuários
  const resumo = {
    total: usuarios.length,
    ativos: usuarios.filter((u) => u.ativo).length,
    blocos: Array.from(new Set(usuarios.map((u) => u.bloco))).length,
  };

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Consulta"
        title="Encontre moradores rapidamente"
        description="Busque por nome, apartamento ou bloco para visualizar dados de contato e unidade."
        status={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">{resumo.ativos} ativos</Badge>
            <Badge variant="info">{resumo.total} usuários</Badge>
            <Badge variant="info">{resumo.blocos} blocos</Badge>
          </div>
        }
      />

      <section className="space-y-4 animate-slide-up">
        <div className="max-w-xl">
          <Input
            placeholder="Buscar por nome, apartamento ou bloco..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading && usuarios.length === 0 ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className={`h-24 bg-slate-200 dark:bg-slate-700/50 rounded-2xl animate-pulse`} />
            ))
          ) : usuariosOrdenados.map((usuario, i) => (
            <Card key={usuario.id} hover gradient className={`animate-slide-up stagger-${Math.min(i + 1, 6)}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0">
                    {usuario.nome ? usuario.nome.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate">{usuario.nome}</h3>
                    </div>
                    <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
                      <p className="flex items-center gap-1.5 capitalize">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                        </svg>
                        Apt {usuario.apartamento} — Bloco {usuario.bloco}
                      </p>
                      {usuario.telefone && (
                        <p className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.114-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                          </svg>
                          {usuario.telefone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!isLoading && usuariosOrdenados.length === 0 && (
          <div className="text-center py-12 text-slate-400 animate-slide-up">
            <p className="text-lg">Nenhum usuário encontrado</p>
            <p className="text-sm mt-1">Tente buscar por outro termo</p>
          </div>
        )}
      </section>
    </DashboardPage>
  );
}
