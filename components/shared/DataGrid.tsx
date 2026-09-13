'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ArrowDown, ArrowUp } from 'lucide-react';
import { useQueryParams } from '@/hooks/useQueryParams';
import { cn } from '@/lib/utils';
import type { DataGridProps, SortDirection } from '@/types/data-grid';

export type { Column, DataGridMeta, DataGridProps, SortDirection } from '@/types/data-grid';

export function DataGrid<T extends object>({
  columns,
  data,
  mode = 'client',
  pagination = true,
  meta,
  totalCount,
  pageSizeOptions = [5, 10, 20, 50],
  defaultPageSize = 5,
  pageQueryKey = 'page',
  limitQueryKey = 'limit',
  sortQueryKey = 'sort',
  orderQueryKey = 'order',
  onPaginationChange,
  onSortChange,
  className,
}: DataGridProps<T>) {
  const { getParam, setQueryParams, isPending } = useQueryParams();
  const isServer = mode === 'server';

  // --- 1. LOCAL CLIENT STATE ---
  const [clientPage, setClientPage] = useState<number>(1);
  const [clientPageSize, setClientPageSize] = useState<number>(defaultPageSize);
  const [clientSort, setClientSort] = useState<{ key: string; direction: SortDirection }>({
    key: '',
    direction: 'asc',
  });

  // --- 2. DERIVED SORT STATE ---
  const activeSortKey = useMemo(() => {
    return isServer ? getParam(sortQueryKey) || '' : clientSort.key;
  }, [isServer, getParam, sortQueryKey, clientSort.key]);

  const activeSortOrder = useMemo(() => {
    if (isServer) {
      const order = getParam(orderQueryKey);
      return order === 'desc' ? 'desc' : 'asc';
    }
    return clientSort.direction;
  }, [isServer, getParam, orderQueryKey, clientSort.direction]);

  // --- 3. SORT HANDLER ---
  const handleSort = (columnKey: string) => {
    let newDirection: SortDirection = 'asc';

    if (activeSortKey === columnKey) {
      newDirection = activeSortOrder === 'asc' ? 'desc' : 'asc';
    }

    if (isServer) {
      setQueryParams({
        [sortQueryKey]: columnKey,
        [orderQueryKey]: newDirection,
        [pageQueryKey]: 1, // Reset page to 1 when sorting changes
      });
    } else {
      setClientSort({ key: columnKey, direction: newDirection });
      setClientPage(1); // Reset page to 1 so the sort change is immediately visible
      onSortChange?.(columnKey, newDirection);
    }
  };

  // --- 4. DATA SORTING & PAGINATION (Client Mode) ---
  const processedData = useMemo(() => {
    if (isServer || !activeSortKey) return data;

    const activeColumn = columns.find((col) => col.key === activeSortKey);

    return [...data].sort((a, b) => {
      const withSortValue = (row: T): unknown =>
        activeColumn?.sortValue
          ? activeColumn.sortValue(row)
          : (row as Record<string, unknown>)[activeSortKey];

      const valA = withSortValue(a);
      const valB = withSortValue(b);

      // Handle null or undefined values gracefully
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      // 1. Direct Numeric Comparison
      if (typeof valA === 'number' && typeof valB === 'number') {
        return activeSortOrder === 'asc' ? valA - valB : valB - valA;
      }

      // 2. Date Objects Comparison
      if (valA instanceof Date && valB instanceof Date) {
        return activeSortOrder === 'asc'
          ? valA.getTime() - valB.getTime()
          : valB.getTime() - valA.getTime();
      }

      // 3. String / Mixed Comparison (using numeric sensitivity for values like "Week 1", "Week 10", etc.)
      const strA = String(valA);
      const strB = String(valB);

      const comparison = strA.localeCompare(strB, undefined, {
        numeric: true,
        sensitivity: 'base',
      });

      return activeSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [isServer, data, activeSortKey, activeSortOrder, columns]);

  // --- 5. DERIVED PAGINATION STATE ---
  const currentPage = useMemo(() => {
    if (isServer) {
      if (meta) return meta.page;
      const p = parseInt(getParam(pageQueryKey) || '1', 10);
      return isNaN(p) || p < 1 ? 1 : p;
    }
    return clientPage;
  }, [isServer, meta, getParam, pageQueryKey, clientPage]);

  const pageSize = useMemo(() => {
    if (isServer) {
      if (meta) return meta.pageSize;
      const l = parseInt(getParam(limitQueryKey) || String(defaultPageSize), 10);
      return isNaN(l) ? defaultPageSize : l;
    }
    return clientPageSize;
  }, [isServer, meta, getParam, limitQueryKey, defaultPageSize, clientPageSize]);

  const total = isServer
    ? (meta?.total ?? Math.max(totalCount ?? 0, data.length))
    : processedData.length;
  const totalPages = Math.max(1, meta?.totalPages ?? Math.ceil(total / pageSize));

  // In server mode the pagination footer is driven by `meta`: it shows whenever there is
  // more than one page (unless explicitly disabled via the `pagination` prop).
  const shouldShowPagination = isServer ? (meta ? meta.totalPages > 1 : pagination) : pagination;

  const paginatedData = useMemo(() => {
    if (isServer || !pagination) return processedData;
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [isServer, pagination, processedData, currentPage, pageSize]);

  // --- 6. PAGINATION HANDLERS ---
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;

    if (isServer) {
      setQueryParams({ [pageQueryKey]: newPage });
      onPaginationChange?.(newPage, pageSize);
    } else {
      setClientPage(newPage);
      onPaginationChange?.(newPage, pageSize);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    if (isServer) {
      setQueryParams({ [limitQueryKey]: newSize, [pageQueryKey]: 1 });
    } else {
      setClientPageSize(newSize);
      setClientPage(1);
      onPaginationChange?.(1, newSize);
    }
  };

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= defaultPageSize) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage, defaultPageSize]);

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div
        className={cn(
          'overflow-x-auto rounded-xl bg-white shadow transition-opacity',
          isPending && 'opacity-60',
        )}
      >
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-gray-50/50 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
              {columns.map((col) => {
                const isActiveSort = activeSortKey === col.key;
                const isDesc = activeSortOrder === 'desc';

                return (
                  <th
                    key={col.key}
                    className={cn(
                      'px-6 py-4 text-xs font-semibold text-gray-500',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right',
                      col.headCellColor,
                      col.width,
                    )}
                  >
                    <div
                      onClick={() => col.sortable && handleSort(col.key)}
                      className={cn(
                        'inline-flex items-center gap-1.5 select-none',
                        col.sortable && 'cursor-pointer hover:text-gray-900',
                        col.align === 'center' && 'justify-center',
                        col.align === 'right' && 'justify-end',
                      )}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <div className="flex items-center">
                          {isActiveSort ? (
                            isDesc ? (
                              <ArrowDown className="h-3 w-3 text-[#1D61E8]" />
                            ) : (
                              <ArrowUp className="h-3 w-3 text-[#1D61E8]" />
                            )
                          ) : (
                            <ArrowDown className="h-3 w-3 text-gray-400 opacity-60 hover:opacity-100" />
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-gray-400">
                  No records found.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={((row as Record<string, unknown>).id as React.Key) || rowIndex}
                  className="border-b border-gray-200 transition-colors hover:bg-gray-50/60"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-6 py-4 font-normal text-gray-900',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                        col.bodyCellColor,
                      )}
                    >
                      {col.render
                        ? col.render(row, rowIndex)
                        : (row as Record<string, React.ReactNode>)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION FOOTER */}
      {shouldShowPagination && (
        <div className="flex flex-col items-center justify-between gap-4 pt-2 sm:flex-row">
          {/* PAGE SIZE SELECTOR — hidden in server mode */}
          {!isServer && (
            <div className="relative inline-flex items-center">
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pr-8 pl-3 text-xs font-medium text-gray-700 hover:border-gray-300 focus:outline-none"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} per page
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-gray-400" />
            </div>
          )}

          {/* PAGE NAVIGATION BUTTONS */}
          <div
            className={cn(
              'flex items-center rounded-lg border border-gray-200 bg-white p-1 text-xs font-medium shadow-xs',
              isServer && 'sm:ml-auto',
            )}
          >
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Previous
            </button>

            <div className="flex items-center space-x-0.5 px-1">
              {pageNumbers.map((num, idx) =>
                typeof num === 'number' ? (
                  <button
                    key={idx}
                    onClick={() => handlePageChange(num)}
                    className={cn(
                      'h-7 w-7 rounded-lg text-center transition-colors',
                      currentPage === num ? 'font-semibold' : 'text-gray-600 hover:bg-gray-100',
                    )}
                  >
                    {num}
                  </button>
                ) : (
                  <span key={idx} className="px-1.5 text-gray-400">
                    {num}
                  </span>
                ),
              )}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
