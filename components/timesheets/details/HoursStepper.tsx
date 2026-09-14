'use client';

import { Minus, Plus } from 'lucide-react';
import { TIMESHEET_HOURS_STEP } from '@/lib/constants';
import { clampHours } from '@/lib/helpers';

interface HoursStepperProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}

/** Number input with –/+ buttons that step and clamp hours to [0.5, 24]. */
export function HoursStepper({ id, value, onChange }: HoursStepperProps) {
  const hoursValue = parseFloat(value) || 0;

  return (
    <div className="flex h-9.5 items-stretch overflow-hidden rounded-lg border border-gray-200 bg-white transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <button
        type="button"
        onClick={() => onChange(clampHours(hoursValue - TIMESHEET_HOURS_STEP))}
        aria-label="Decrease hours"
        className="flex w-8.5 shrink-0 items-center justify-center bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={0.5}
        max={24}
        step={TIMESHEET_HOURS_STEP}
        className="w-full min-w-0 [appearance:textfield] border-x border-gray-200 bg-white text-center text-sm text-gray-500 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(clampHours(hoursValue + TIMESHEET_HOURS_STEP))}
        aria-label="Increase hours"
        className="flex w-8.5 shrink-0 items-center justify-center bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
