'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const defaultIcon = (
  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-8.25A2.25 2.25 0 0017.25 3.75H6.75A2.25 2.25 0 004.5 6v12A2.25 2.25 0 006.75 20.25h6.75" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 8.25h6M9 12h3m6 4.5l1.5 1.5 3-3" />
  </svg>
);

export default function EmptyState({ title, description, action, icon = defaultIcon, className = '' }: EmptyStateProps) {
  return (
    <div className={`rounded-[24px] border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40 ${className}`}>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        {icon}
      </div>
      <div className="mt-4 space-y-2">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="mx-auto max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}