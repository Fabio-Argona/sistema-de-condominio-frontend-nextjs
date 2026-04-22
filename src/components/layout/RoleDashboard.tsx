'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface DashboardPageProps {
  children: ReactNode;
}

interface DashboardHeroProps {
  eyebrow?: string;
  title: string;
  description: string;
  status?: ReactNode;
  aside?: ReactNode;
}

interface DashboardActionsProps {
  actions: Array<{
    href: string;
    title: string;
    description: string;
    accent: string;
    icon: ReactNode;
  }>;
}

interface DashboardSectionTitleProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function DashboardPage({ children }: DashboardPageProps) {
  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_22%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_22%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
      <div className="mx-auto flex w-full max-w-7xl justify-center px-1.5 py-4 sm:px-6 lg:px-8 lg:py-8">
        <div className="w-full space-y-5 rounded-[24px] border border-white/70 bg-white/80 p-3 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/82 sm:rounded-[28px] sm:space-y-6 sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export function DashboardHero({ eyebrow, title, description, status, aside }: DashboardHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-[linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(239,246,255,0.92)_52%,_rgba(236,253,245,0.85)_100%)] p-4 shadow-[0_24px_60px_-40px_rgba(14,165,233,0.45)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(15,23,42,0.92)_52%,_rgba(6,78,59,0.22)_100%)] sm:rounded-[28px] sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_54%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.18),_transparent_54%)]" />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="space-y-4">
          {eyebrow ? (
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              {description}
            </p>
          </div>
          {status ? <div>{status}</div> : null}
        </div>
        {aside ? <div className="relative">{aside}</div> : null}
      </div>
    </section>
  );
}

export function DashboardActions({ actions }: DashboardActionsProps) {
  return (
    <section className="space-y-3">
      <DashboardSectionTitle
        title="Ações rápidas"
        description="Atalhos para as tarefas mais recorrentes do dia."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <Link
            key={action.href + action.title}
            href={action.href}
            className={`group rounded-3xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5 ${action.accent}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-base font-bold text-slate-900 dark:text-white">{action.title}</p>
                <p className="text-sm leading-5 text-slate-600 dark:text-slate-300">{action.description}</p>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-slate-700 shadow-sm transition-transform duration-200 group-hover:scale-105 dark:bg-slate-900/70 dark:text-slate-100">
                {action.icon}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DashboardSectionTitle({ title, description, action }: DashboardSectionTitleProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
        {description ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}