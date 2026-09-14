'use client';

import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WorkActionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

/** Row-level Edit/Delete dropdown for a single work item. */
export function WorkActionsMenu({ onEdit, onDelete }: WorkActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Work actions"
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32 border-none bg-white shadow-sm">
        <DropdownMenuItem
          onClick={onEdit}
          className="cursor-pointer text-sm font-normal text-gray-700 focus:bg-gray-50"
        >
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          className="cursor-pointer text-sm font-normal text-red-600 focus:bg-red-50 focus:text-red-600"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
