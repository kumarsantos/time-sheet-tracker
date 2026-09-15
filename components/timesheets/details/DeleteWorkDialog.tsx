'use client';

import { X, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteWorkDialogProps {
  open: boolean;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Delete confirmation for a work item (totals + status are recomputed server-side). */
export function DeleteWorkDialog({ open, isPending, onCancel, onConfirm }: DeleteWorkDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-lg p-0 sm:max-w-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete work
          </DialogTitle>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-gray-600">
            Are you sure you want to delete this work item? The timesheet total and status will be
            recalculated.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-6 py-5">
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="h-10 flex-1 rounded-lg disabled:opacity-60"
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-10 flex-1 rounded-lg border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
