'use client';

import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = 'itens',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  const pageNumbers = [];
  const startPage = Math.max(1, safeCurrentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);

  for (let page = startPage; page <= endPage; page += 1) {
    pageNumbers.push(page);
  }

  return (
    <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 dark:border-slate-700/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Exibindo {startItem}-{endItem} de {totalItems} {itemLabel}
        </span>
        <div className="w-full sm:w-32">
          <Select
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            options={pageSizeOptions.map((option) => ({ value: String(option), label: `${option} por página` }))}
            placeholder="Por página"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button variant="outline" size="sm" onClick={() => onPageChange(safeCurrentPage - 1)} disabled={safeCurrentPage <= 1}>
          Anterior
        </Button>
        <div className="hidden items-center gap-1 sm:flex">
          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`min-w-9 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                page === safeCurrentPage
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400 sm:hidden">
          {safeCurrentPage} / {totalPages}
        </span>
        <Button variant="outline" size="sm" onClick={() => onPageChange(safeCurrentPage + 1)} disabled={safeCurrentPage >= totalPages}>
          Próxima
        </Button>
      </div>
    </div>
  );
}