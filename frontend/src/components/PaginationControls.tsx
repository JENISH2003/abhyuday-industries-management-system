import React, { useState, useEffect } from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ArrowRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = 'records',
}) => {
  if (totalRecords === 0) return null;

  const [jumpPage, setJumpPage] = useState<string>('');
  const safeTotalPages = Math.max(1, totalPages);
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalRecords);

  useEffect(() => {
    setJumpPage('');
  }, [currentPage]);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPage, 10);
    if (!isNaN(p) && p >= 1 && p <= safeTotalPages) {
      onPageChange(p);
      setJumpPage('');
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (safeTotalPages <= maxVisible) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(safeTotalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= safeTotalPages - 2) {
        start = safeTotalPages - 3;
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < safeTotalPages - 1) pages.push('...');

      pages.push(safeTotalPages);
    }

    return pages;
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-soft flex flex-col lg:flex-row items-center justify-between gap-4 text-xs font-medium select-none">
      {/* Count & Page Size Select */}
      <div className="flex flex-wrap items-center gap-3 text-muted-foreground w-full lg:w-auto justify-between lg:justify-start">
        <span>
          Showing <strong className="text-foreground">{startItem === endItem ? startItem.toLocaleString() : `${startItem.toLocaleString()}–${endItem.toLocaleString()}`}</strong> of <strong className="text-foreground">{totalRecords.toLocaleString()}</strong> {itemLabel}
        </span>

        <div className="flex items-center space-x-1.5 pl-3 border-l border-border/80">
          <span className="text-[11px] font-bold">Per Page:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-2 py-1 border border-border rounded-lg bg-background text-foreground font-bold text-xs outline-none cursor-pointer focus:border-brand"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pagination Controls & Direct Page Jump */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
        <div className="flex items-center space-x-1">
          {/* Go to First Page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            title="First Page"
            className="p-1.5 border border-border rounded-lg bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronsLeft size={16} />
          </button>

          {/* Previous Page */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Previous Page"
            className="p-1.5 border border-border rounded-lg bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center space-x-1 px-1">
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground font-bold">
                    ...
                  </span>
                );
              }

              const isCurrent = p === currentPage;
              return (
                <button
                  key={`page-${p}`}
                  onClick={() => onPageChange(Number(p))}
                  className={`min-w-[30px] h-[30px] px-2 rounded-lg font-bold transition-all cursor-pointer text-xs ${
                    isCurrent
                      ? 'bg-brand text-white border border-brand shadow-soft'
                      : 'border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= safeTotalPages}
            title="Next Page"
            className="p-1.5 border border-border rounded-lg bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>

          {/* Go to Last Page */}
          <button
            onClick={() => onPageChange(safeTotalPages)}
            disabled={currentPage >= safeTotalPages}
            title="Last Page"
            className="p-1.5 border border-border rounded-lg bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronsRight size={16} />
          </button>
        </div>

        {/* Quick Page Jump Input Box (shown when safeTotalPages > 5) */}
        {safeTotalPages > 5 && (
          <form onSubmit={handleJumpSubmit} className="flex items-center space-x-1.5 border-l border-border/80 pl-3">
            <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">Go to:</span>
            <input
              type="number"
              min={1}
              max={safeTotalPages}
              placeholder="#"
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              className="w-12 px-1.5 py-1 border border-border rounded-lg bg-background text-foreground text-center font-bold text-xs outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={!jumpPage}
              className="p-1 bg-muted hover:bg-muted/80 disabled:opacity-40 rounded-lg border border-border text-foreground transition-colors cursor-pointer"
              title="Jump to page"
            >
              <ArrowRight size={13} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PaginationControls;
