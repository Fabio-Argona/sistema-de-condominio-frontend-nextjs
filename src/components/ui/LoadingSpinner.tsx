export default function LoadingSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} border-3 border-slate-200 dark:border-slate-700 rounded-full`}
        />
        <div
          className={`${sizeClasses[size]} border-3 border-transparent border-t-blue-500 rounded-full animate-spin absolute inset-0`}
        />
      </div>
      {text && (
        <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">{text}</p>
      )}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 rounded-full" />
          <div className="w-16 h-16 border-4 border-transparent border-t-blue-500 border-r-blue-500/30 rounded-full animate-spin absolute inset-0" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Carregando...</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Aguarde um momento</p>
        </div>
      </div>
    </div>
  );
}
