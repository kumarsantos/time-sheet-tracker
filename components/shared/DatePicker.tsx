'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Field, FieldLabel } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Single Date Props
interface SingleDatePickerProps {
  mode: 'single';
  value?: Date;
  defaultValue?: Date;
  onSelect?: (date: Date | undefined) => void;
}

// Range Date Props
interface RangeDatePickerProps {
  mode: 'range';
  value?: DateRange;
  defaultValue?: DateRange;
  onSelect?: (range: DateRange | undefined) => void;
}

// Common Shared Props
type CommonDatePickerProps = {
  label?: React.ReactNode;
  placeholder?: string;
  className?: string;
  numberOfMonths?: number;
  disabled?: boolean;
  align?: 'start' | 'center' | 'end';
  children?: React.ReactNode;
};

export type DatePickerProps = CommonDatePickerProps &
  (SingleDatePickerProps | RangeDatePickerProps);

export function DatePicker(props: DatePickerProps) {
  const {
    label,
    placeholder = 'Select date',
    className,
    disabled = false,
    align = 'start',
    children,
  } = props;

  const mode = props.mode;
  const numberOfMonths = props.numberOfMonths ?? (mode === 'range' ? 2 : 1);

  // 1. Uncontrolled fallback state
  const [uncontrolledDate, setUncontrolledDate] = React.useState<Date | DateRange | undefined>(
    props.defaultValue,
  );

  // 2. Determine active date: use controlled `props.value` if provided, otherwise fallback to local state
  const isControlled = props.value !== undefined;
  const dateState = isControlled ? props.value : uncontrolledDate;

  // Handle value text rendering...
  const renderValueText = () => {
    if (children) return children;

    if (mode === 'single') {
      const singleDate = dateState as Date | undefined;
      return singleDate ? format(singleDate, 'LLL dd, yyyy') : placeholder;
    }

    if (mode === 'range') {
      const rangeDate = dateState as DateRange | undefined;
      if (rangeDate?.from) {
        if (rangeDate.to) {
          return `${format(rangeDate.from, 'LLL dd, yyyy')} - ${format(rangeDate.to, 'LLL dd, yyyy')}`;
        }
        return format(rangeDate.from, 'LLL dd, yyyy');
      }
    }

    return placeholder;
  };

  const hasSelectedValue = Boolean(
    mode === 'single'
      ? (dateState as Date | undefined)
      : (dateState as DateRange | undefined)?.from,
  );

  return (
    <Field className={cn('w-full', className)}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              'justify-between rounded-sm border-gray-300 bg-white font-normal hover:bg-gray-50 focus:ring-2 focus:ring-[#1D61E8]/20',
              !hasSelectedValue && 'text-gray-500',
            )}
          >
            <span className="truncate">{renderValueText()}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-gray-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto rounded-sm p-0" align={align}>
          {props.mode === 'single' ? (
            <Calendar
              mode="single"
              selected={dateState as Date | undefined}
              onSelect={(date) => {
                if (!isControlled) {
                  setUncontrolledDate(date);
                }
                props.onSelect?.(date);
              }}
              autoFocus
            />
          ) : (
            <Calendar
              mode="range"
              defaultMonth={(dateState as DateRange | undefined)?.from}
              selected={dateState as DateRange | undefined}
              onSelect={(range) => {
                if (!isControlled) {
                  setUncontrolledDate(range);
                }
                props.onSelect?.(range);
              }}
              numberOfMonths={numberOfMonths}
              autoFocus
            />
          )}
        </PopoverContent>
      </Popover>
    </Field>
  );
}
