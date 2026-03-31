'use client';

import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: number; label: string };
  color: 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'indigo';
}

const colorMap = {
  blue: {
    bg: 'from-blue-500 to-blue-600',
    shadow: 'shadow-blue-500/20',
    light: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
  },
  emerald: {
    bg: 'from-emerald-500 to-emerald-600',
    shadow: 'shadow-emerald-500/20',
    light: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    bg: 'from-amber-500 to-amber-600',
    shadow: 'shadow-amber-500/20',
    light: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
  },
  red: {
    bg: 'from-red-500 to-red-600',
    shadow: 'shadow-red-500/20',
    light: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
  },
  purple: {
    bg: 'from-purple-500 to-purple-600',
    shadow: 'shadow-purple-500/20',
    light: 'bg-purple-50 dark:bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
  },
  indigo: {
    bg: 'from-indigo-500 to-indigo-600',
    shadow: 'shadow-indigo-500/20',
    light: 'bg-indigo-50 dark:bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
};

export default function StatsCard({ title, value, icon, trend, color }: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2 tracking-tight">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`text-xs font-semibold ${
                  trend.value >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-slate-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className={`p-3 rounded-xl bg-gradient-to-br ${colors.bg} text-white shadow-lg ${colors.shadow} group-hover:scale-110 transition-transform duration-300`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
