'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import { useQueryParams } from '@/hooks/useQueryParams';
import { DatePicker } from '../shared/DatePicker';
import { Dropdown as StatusFilter, type SelectOption } from '../shared/Dropdown';

interface StatusSectionProps {
  statusItems?: SelectOption[];
  multipleStatus?: boolean;

  // --- CLIENT-SIDE CALLBACKS (Optional) ---
  onDateRangeChange?: (range: DateRange | undefined) => void;
  onStatusChange?: (status: string | string[]) => void;

  // --- CONTROLLED CLIENT-SIDE VALUES (Optional) ---
  dateRange?: DateRange;
  statusValue?: string | string[];

  // --- URL QUERY PARAM KEYS (Optional overrides) ---
  dateQueryKeyStart?: string;
  dateQueryKeyEnd?: string;
  statusQueryKey?: string;
}

export const StatusSection: React.FC<StatusSectionProps> = ({
  statusItems = [],
  multipleStatus = false,
  onDateRangeChange,
  onStatusChange,
  dateRange: clientDateRange,
  statusValue: clientStatusValue,
  dateQueryKeyStart = 'startDate',
  dateQueryKeyEnd = 'endDate',
  statusQueryKey = 'status',
}) => {
  const { getParam, setQueryParams, isPending } = useQueryParams();

  const isServerModeDate = !onDateRangeChange;
  const isServerModeStatus = !onStatusChange;

  // --- 1. DERIVED DATE STATE ---
  const dateRange: DateRange | undefined = React.useMemo(() => {
    if (!isServerModeDate) return clientDateRange;

    const startParam = getParam(dateQueryKeyStart);
    const endParam = getParam(dateQueryKeyEnd);

    return {
      from: startParam ? parseISO(startParam) : undefined,
      to: endParam ? parseISO(endParam) : undefined,
    };
  }, [isServerModeDate, clientDateRange, getParam, dateQueryKeyStart, dateQueryKeyEnd]);

  // --- 2. DERIVED STATUS STATE ---
  const statusValue = React.useMemo(() => {
    if (!isServerModeStatus) return clientStatusValue;

    const rawParam = getParam(statusQueryKey) || multipleStatus ? '' : 'all';
    if (multipleStatus) {
      return rawParam ? rawParam.split(',') : [];
    }
    return rawParam;
  }, [isServerModeStatus, clientStatusValue, getParam, statusQueryKey, multipleStatus]);

  // --- 3. HANDLERS ---
  const handleDateSelect = (newRange: DateRange | undefined) => {
    if (onDateRangeChange) {
      onDateRangeChange(newRange);
      return;
    }

    setQueryParams({
      [dateQueryKeyStart]: newRange?.from ? format(newRange.from, 'yyyy-MM-dd') : null,
      [dateQueryKeyEnd]: newRange?.to ? format(newRange.to, 'yyyy-MM-dd') : null,
    });
  };

  return (
    <div className={`flex items-center gap-2 ${isPending ? 'opacity-70 transition-opacity' : ''}`}>
      <DatePicker
        mode="range"
        placeholder="Date Range"
        value={dateRange}
        onSelect={handleDateSelect}
        className="w-48"
      />

      {multipleStatus ? (
        <StatusFilter
          multiple
          items={statusItems.filter((item) => item.value !== 'all')}
          value={Array.isArray(statusValue) ? statusValue : statusValue ? [statusValue] : []}
          onValueChange={(val) => {
            if (onStatusChange) {
              onStatusChange(val);
              return;
            }
            setQueryParams({ [statusQueryKey]: val.length ? val.join(',') : null });
          }}
          placeholder="Status"
          className="w-auto min-w-48"
        />
      ) : (
        <StatusFilter
          multiple={false}
          items={statusItems}
          value={typeof statusValue === 'string' ? statusValue : statusValue?.[0] || ''}
          onValueChange={(val) => {
            if (onStatusChange) {
              onStatusChange(val);
              return;
            }
            setQueryParams({ [statusQueryKey]: val || null });
          }}
          placeholder="Status"
          className="w-auto min-w-48"
        />
      )}
    </div>
  );
};

export default StatusSection;
