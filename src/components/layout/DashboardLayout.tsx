'use client';

import Image from 'next/image';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import api from '@/lib/api';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (lastTrackedRef.current === pathname) return;
    lastTrackedRef.current = pathname;
    api.post('/log-acessos', { pagina: pathname }).catch(() => { /* silencioso */ });
  }, [pathname, isLoading]);

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Mobile TopBar - Menu Sanduíche */}
      <header className="lg:hidden flex items-center justify-between px-5 py-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <Image src="/oceano-logo.png" alt="Oceano Logo" width={40} height={40} className="h-10 w-10 object-contain drop-shadow-sm" priority />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] leading-none mb-0.5">Residencial</span>
            <span className="text-lg font-black text-slate-800 dark:text-white tracking-tight leading-none">OCEANO</span>
          </div>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 border border-transparent hover:border-blue-200 dark:hover:border-blue-500/30"
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </header>

      {/* Sidebar Mobile & Desktop */}
      <Sidebar isMobileOpen={isSidebarOpen} setIsMobileOpen={setIsSidebarOpen} />
      
      {/* Principal Content Area */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
