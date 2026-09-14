'use client';

import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SelectOption {
  label: string;
  value: string;
}

// Single Select Props
interface SingleSelectProps {
  multiple?: false;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

// Multi Select Props
interface MultiSelectProps {
  multiple: true;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}

// Combined Base Props
type CommonProps = {
  items: SelectOption[];
  placeholder?: string;
  groupLabel?: string;
  disabled?: boolean;
  className?: string;
};

export type DropdownProps = CommonProps & (SingleSelectProps | MultiSelectProps);

export function Dropdown(props: DropdownProps) {
  const {
    items,
    placeholder = 'Select option...',
    groupLabel,
    disabled = false,
    className = 'w-full max-w-48',
  } = props;

  // --- MULTI-SELECT RENDER ---
  if (props.multiple) {
    const selectedValues = props.value || props.defaultValue || [];

    const handleSelect = (optionValue: string) => {
      const updatedValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];

      props.onValueChange?.(updatedValues);
    };

    const handleRemove = (optionValue: string, e: React.MouseEvent) => {
      e.stopPropagation();
      props.onValueChange?.(selectedValues.filter((v) => v !== optionValue));
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={cn(
              'h-auto justify-between rounded-lg border-gray-300 bg-white px-3 py-2 text-left font-normal hover:bg-white focus:ring-2 focus:ring-[#1D61E8]/20 focus:ring-offset-0',
              className,
            )}
          >
            <div className="flex max-w-[calc(100%-20px)] flex-wrap items-center gap-1">
              {selectedValues.length === 0 && (
                <span className="text-sm text-gray-500">{placeholder}</span>
              )}
              {selectedValues.map((val) => {
                const item = items.find((i) => i.value === val);
                return (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="gap-1 rounded-md bg-gray-100 pr-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    {item?.label || val}
                    <button
                      type="button"
                      aria-label={`Remove ${item?.label || val}`}
                      className="flex cursor-pointer items-center rounded-sm text-gray-400 hover:text-gray-600 focus:ring-2 focus:ring-[#1D61E8]/20 focus:outline-none"
                      onClick={(e) => handleRemove(val, e)}
                    >
                      <span aria-hidden="true">
                        <X className="h-3 w-3" />
                      </span>
                    </button>
                  </Badge>
                );
              })}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-gray-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 rounded-xl p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." aria-label="Filter options" />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup heading={groupLabel}>
                {items.map((item) => {
                  const isSelected = selectedValues.includes(item.value);
                  return (
                    <CommandItem
                      key={item.value}
                      onSelect={() => handleSelect(item.value)}
                      className="cursor-pointer"
                    >
                      <div
                        className={cn(
                          'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-gray-300 transition-colors',
                          isSelected
                            ? 'border-[#1D61E8] bg-[#1D61E8] text-white'
                            : 'opacity-50 [&_svg]:invisible',
                        )}
                      >
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  // --- SINGLE SELECT RENDER ---
  return (
    <Select
      value={props.value}
      defaultValue={props.defaultValue}
      onValueChange={props.onValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn('rounded-sm border-gray-300 bg-white', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-sm">
        <SelectGroup>
          {groupLabel && <SelectLabel>{groupLabel}</SelectLabel>}
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
