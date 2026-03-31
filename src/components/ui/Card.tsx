'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className = '', hover = false, gradient = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl border border-slate-200/50 dark:border-slate-700/50
        ${gradient 
          ? 'bg-gradient-to-br from-white via-white to-blue-50/30 dark:from-slate-800 dark:via-slate-800 dark:to-blue-900/10' 
          : 'bg-white dark:bg-slate-800'
        }
        shadow-sm dark:shadow-slate-900/20
        backdrop-blur-sm
        ${hover ? 'transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5 hover:border-blue-200/50 dark:hover:border-blue-700/50 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 ${className}`}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function CardContent({ children, className = '', onClick }: CardContentProps) {
  return <div className={`px-6 py-4 ${className}`} onClick={onClick}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`px-6 py-4 border-t border-slate-100 dark:border-slate-700/50 ${className}`}>
      {children}
    </div>
  );
}
