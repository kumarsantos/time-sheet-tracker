'use client';

import type { WorkItem } from '@/types/timesheet-details';
import { WorkActionsMenu } from './WorkActionsMenu';

interface WorkRowProps {
  work: WorkItem;
  onEdit: () => void;
  onDelete: () => void;
}

/** Single work item row: label, hours, project badge and row actions. */
export function WorkRow({ work, onEdit, onDelete }: WorkRowProps) {
  return (
    <div className="group flex flex-col gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 shadow-2xs transition-all hover:border-gray-200 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="min-w-0 truncate text-base font-medium text-gray-900">
        {work.description || work.typeOfWork}
      </span>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="shrink-0 text-sm text-gray-400">{parseFloat(work.hours)} hrs</span>
        <span className="max-w-[10rem] truncate rounded-md bg-[#E1EFFE] px-2.5 py-1 text-xs font-medium text-[#1E429F]">
          {work.projectName}
        </span>
        <WorkActionsMenu onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}
