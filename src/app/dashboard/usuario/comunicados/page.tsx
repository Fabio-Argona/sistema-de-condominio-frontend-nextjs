'use client';

import { useEffect, useState } from 'react';
import Card, { CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Comunicado } from '@/types';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface PollOpcao { label: string; votos: number; }
interface Poll { id: number; pergunta: string; opcoes: PollOpcao[]; }

const POLLS_STORAGE_KEY = 'sindico-enquetes-v2';
const VOTED_STORAGE_KEY = 'usuario-enquetes-votadas';
const LEGACY_VOTED_STORAGE_KEY = 'morador-enquetes-votadas';

export default function UsuarioComunicadosPage() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votadas, setVotadas] = useState<Record<number, number>>({}); // pollId → opçãoIndex votada
  const { get, isLoading } = useApi<Comunicado[]>();
  const { user } = useAuth();

  useEffect(() => {
    void (async () => {
      const data = await get('/comunicados');
      if (data) {
        setComunicados(data);
      }
    })();
  }, [get]);

  // Carrega enquetes e votos do localStorage
  useEffect(() => {
    try {
      let nextPolls: Poll[] | null = null;
      let nextVotadas: Record<number, number> | null = null;

      const savedPolls = localStorage.getItem(POLLS_STORAGE_KEY);
      if (savedPolls) {
        const parsed = JSON.parse(savedPolls) as Poll[];
        if (Array.isArray(parsed)) nextPolls = parsed;
      }
      const votedKey = `${VOTED_STORAGE_KEY}-${user?.id}`;
      const savedVoted = localStorage.getItem(votedKey);
      const legacyVoted = localStorage.getItem(`${LEGACY_VOTED_STORAGE_KEY}-${user?.id}`);
      if (savedVoted) nextVotadas = JSON.parse(savedVoted) as Record<number, number>;
      else if (legacyVoted) nextVotadas = JSON.parse(legacyVoted) as Record<number, number>;

      Promise.resolve().then(() => {
        if (nextPolls) setPolls(nextPolls);
        if (nextVotadas) setVotadas(nextVotadas);
      });
    } catch { /* silencioso */ }
  }, [user?.id]);

  const handleVote = (pollId: number, opcaoIndex: number) => {
    if (votadas[pollId] !== undefined) {
      toast.error('Você já votou nesta enquete');
      return;
    }

    // Incrementa voto no poll e persiste
    const updatedPolls = polls.map((p) => {
      if (p.id !== pollId) return p;
      return {
        ...p,
        opcoes: p.opcoes.map((op, idx) =>
          idx === opcaoIndex ? { ...op, votos: op.votos + 1 } : op
        ),
      };
    });
    setPolls(updatedPolls);
    try { localStorage.setItem(POLLS_STORAGE_KEY, JSON.stringify(updatedPolls)); } catch { /* silencioso */ }

    // Registra voto do usuario
    const novasVotadas = { ...votadas, [pollId]: opcaoIndex };
    setVotadas(novasVotadas);
    try {
      const votedKey = `${VOTED_STORAGE_KEY}-${user?.id}`;
      localStorage.setItem(votedKey, JSON.stringify(novasVotadas));
    } catch { /* silencioso */ }

    toast.success('Voto registrado!');
  };

  if (isLoading && comunicados.length === 0) return <div className="space-y-4 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl" />)}</div>;

  return (
    <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="w-full max-w-5xl px-4 sm:px-8 py-10 space-y-6 bg-white dark:bg-slate-950 shadow-lg rounded-2xl border border-slate-100 dark:border-slate-800 my-8">
        <div className="animate-slide-up">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">Comunicados</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Fique por dentro das novidades do condomínio</p>
        </div>

        <div className="space-y-4">
          {comunicados.length === 0 ? (
            <p className="text-slate-500 py-8 text-center text-lg">Nenhum comunicado no momento.</p>
          ) : (
            comunicados.map((c, i) => (
              <Card key={c.id} hover gradient className={`animate-slide-up stagger-${i % 5 + 1}`}>
                <CardContent className="p-6 cursor-pointer" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {c.importante && <Badge variant="danger" dot>Importante</Badge>}
                    <Badge variant="info">{c.categoria}</Badge>
                    <span className="text-xs text-slate-400">{c.dataCriacao}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{c.titulo}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{expandedId === c.id ? c.conteudo : c.conteudo.substring(0, 120) + (c.conteudo.length > 120 ? '...' : '')}</p>
                  <p className="text-xs text-slate-400 mt-2">Por: {c.autor}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {polls.length > 0 && (
          <Card className="animate-slide-up">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Enquetes e Votações</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Participe das decisões do condomínio</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {polls.map((poll) => {
                  const total = poll.opcoes.reduce((acc, op) => acc + op.votos, 0);
                  const jaVotou = votadas[poll.id] !== undefined;
                  return (
                    <div key={poll.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{poll.pergunta}</p>
                      <p className="text-xs text-slate-500 mt-1">{total} voto{total !== 1 ? 's' : ''}</p>
                      <div className="mt-3 space-y-2">
                        {poll.opcoes.map((opcao, idx) => {
                          const percentual = total > 0 ? Math.round((opcao.votos / total) * 100) : 0;
                          const isVotada = votadas[poll.id] === idx;
                          return (
                            <div key={opcao.label}>
                              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                <span className={isVotada ? 'font-bold text-blue-600 dark:text-blue-400' : ''}>{opcao.label}{isVotada ? ' ✓' : ''}</span>
                                {jaVotou && <span>{percentual}%</span>}
                              </div>
                              {jaVotou && (
                                <div className="h-2 rounded bg-slate-100 dark:bg-slate-800">
                                  <div className={`h-2 rounded transition-all ${isVotada ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} style={{ width: `${percentual}%` }} />
                                </div>
                              )}
                              {!jaVotou && (
                                <Button variant="outline" onClick={() => handleVote(poll.id, idx)} className="w-full mt-1 text-xs py-1.5">
                                  Votar
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {jaVotou && <p className="text-xs text-slate-400 mt-2 text-center">Voto registrado</p>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
