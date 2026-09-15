'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addWorkFormSchema, type AddWorkFormData } from '@/lib/validations/timesheet';
import { INITIAL_WORK_FORM_VALUES, INITIAL_WORK_HOURS_DEFAULT } from '@/lib/constants';
import type { AddWorkOptions, WorkItem } from '@/types/timesheet-details';
import { HoursStepper } from './HoursStepper';

interface WorkEditorDialogProps {
  open: boolean;
  editingWork: WorkItem | null;
  options: AddWorkOptions;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (values: AddWorkFormData) => void;
}

/** Add / Edit work dialog. Owns the work form and forwards submitted values up. */
export function WorkEditorDialog({
  open,
  editingWork,
  options,
  isPending,
  onClose,
  onSubmit,
}: WorkEditorDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddWorkFormData, boolean, AddWorkFormData>({
    resolver: zodResolver(addWorkFormSchema),
    defaultValues: INITIAL_WORK_FORM_VALUES,
  });

  // Re-seed the form each time the dialog opens, honouring the edit target.
  useEffect(() => {
    if (open) {
      reset(
        editingWork
          ? {
              projectId: editingWork.projectId,
              typeOfWork: editingWork.typeOfWork,
              description: editingWork.description,
              hours: editingWork.hours,
            }
          : {
              projectId: '',
              typeOfWork: options.workTypes[0] ?? '',
              description: '',
              hours: INITIAL_WORK_HOURS_DEFAULT,
            },
      );
    }
  }, [open, editingWork, options.workTypes, reset]);

  const isEditing = !!editingWork;
  const submitLabel = isPending
    ? isEditing
      ? 'Saving…'
      : 'Adding…'
    : isEditing
      ? 'Save changes'
      : 'Add entry';

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-lg p-0 sm:max-w-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Entry' : 'Add New Entry'}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4 px-6 py-5">
            {/* Select Project */}
            <div className="space-y-1.5">
              <label
                htmlFor="work-project"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-900"
              >
                Select Project
                <span className="text-red-500">*</span>
                <Info className="h-3.5 w-3.5 text-gray-400" />
              </label>
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                    <SelectTrigger
                      id="work-project"
                      className="w-[60%] rounded-lg border-gray-200 bg-white px-3.5 data-[size=default]:h-10"
                      data-invalid={!!errors.projectId}
                    >
                      <SelectValue placeholder="Project Name" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.projectId && (
                <p className="text-xs font-medium text-red-500">{errors.projectId.message}</p>
              )}
            </div>

            {/* Type of Work */}
            <div className="space-y-1.5">
              <label
                htmlFor="work-type"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-900"
              >
                Type of Work
                <span className="text-red-500">*</span>
                <Info className="h-3.5 w-3.5 text-gray-400" />
              </label>
              <Controller
                control={control}
                name="typeOfWork"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                    <SelectTrigger
                      id="work-type"
                      className="w-[60%] rounded-lg border-gray-200 bg-white px-3.5 data-[size=default]:h-10"
                      data-invalid={!!errors.typeOfWork}
                    >
                      <SelectValue placeholder="Select type of work" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.workTypes.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-gray-400">Loading work types…</div>
                      ) : (
                        options.workTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.typeOfWork && (
                <p className="text-xs font-medium text-red-500">{errors.typeOfWork.message}</p>
              )}
            </div>

            {/* Task description */}
            <div className="space-y-1.5">
              <label
                htmlFor="work-desc"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-900"
              >
                Task description
                <span className="text-red-500">*</span>
              </label>
              <Textarea
                {...register('description')}
                id="work-desc"
                rows={4}
                placeholder="Write text here ..."
                className="min-h-28 resize-none rounded-xl border-gray-200 bg-white px-3.5 py-3"
                aria-invalid={!!errors.description}
              />
              <p className="text-xs text-gray-500">A note for extra info</p>
              {errors.description && (
                <p className="text-xs font-medium text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Hours */}
            <div className="max-w-28 space-y-1.5">
              <label
                htmlFor="work-hours"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-900"
              >
                Hours
                <span className="text-red-500">*</span>
              </label>
              <Controller
                control={control}
                name="hours"
                render={({ field }) => (
                  <HoursStepper id="work-hours" value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.hours && (
                <p className="text-xs font-medium text-red-500">{errors.hours.message}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-gray-100 px-6 py-5">
            <Button
              type="submit"
              disabled={isPending}
              className="h-10 flex-1 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
            >
              {submitLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 flex-1 rounded-lg border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
