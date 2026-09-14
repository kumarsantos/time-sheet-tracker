'use client';

import { Plus } from 'lucide-react';
import { formatDateHeader } from '@/lib/helpers';
import type { TimeEntryItem, WorkItem } from '@/types/timesheet-details';
import { WorkRow } from './WorkRow';

interface DayColumnProps {
  entry: TimeEntryItem;
  onAddWork: () => void;
  onEditWork: (work: WorkItem) => void;
  onDeleteWork: (work: WorkItem) => void;
}

/** One calendar day: date header, its work rows and the "Add new task" action. */
export function DayColumn({ entry, onAddWork, onEditWork, onDeleteWork }: DayColumnProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-start">
      {/* Day Column */}
      <div className="pt-2.5 sm:col-span-2">
        <span className="text-lg font-semibold text-gray-900">
          {formatDateHeader(entry.entryDate)}
        </span>
      </div>

      {/* Works List Column */}
      <div className="space-y-2.5 sm:col-span-10">
        {entry.works.map((work) => (
          <WorkRow
            key={work.id}
            work={work}
            onEdit={() => onEditWork(work)}
            onDelete={() => onDeleteWork(work)}
          />
        ))}

        {/* Add New Task Button Box */}
        <button
          type="button"
          onClick={onAddWork}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[#1A56DB] bg-[#E1EFFE] py-2 text-base font-medium text-[#1A56DB] transition-all hover:bg-[#d4e5ff]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add new task</span>
        </button>
      </div>
    </div>
  );
}
