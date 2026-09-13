import type { ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  headCellColor?: string;
  bodyCellColor?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => ReactNode;
  /** Optional function returning a comparable value (number | string | Date) used for sorting.
      Falls back to row[key]. Useful when the displayed value is a formatted string like "1 - 5 January, 2024". */
  sortValue?: (row: T) => number | string | Date;
}

export interface DataGridMeta {
  /** Current page number (1-based) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

export interface DataGridProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Mode of pagination and sorting. Defaults to 'client' */
  mode?: 'client' | 'server';
  /** Enable/disable pagination. When false, all rows are shown and the pagination footer is hidden. Defaults to true */
  pagination?: boolean;
  /** Server mode pagination metadata. When provided, page/pageSize/totals are taken from here instead of URL params. */
  meta?: DataGridMeta;
  /** Total items count (required in server mode if meta is not provided and data is only a single page slice) */
  totalCount?: number;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Default items per page */
  defaultPageSize?: number;
  /** URL query param keys for server mode */
  pageQueryKey?: string;
  limitQueryKey?: string;
  sortQueryKey?: string;
  orderQueryKey?: string;
  /** Custom callbacks */
  onPaginationChange?: (page: number, pageSize: number) => void;
  onSortChange?: (sortKey: string, direction: SortDirection) => void;
  className?: string;
}
