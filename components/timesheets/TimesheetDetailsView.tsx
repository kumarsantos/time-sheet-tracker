'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Minus, MoreHorizontal, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateHeader, formatRangeSubheader } from '@/lib/helpers';
import { addWorkFormSchema, type AddWorkFormData } from '@/lib/validations/timesheet';
import { timesheetService } from '@/services/timesheet';
import ProgressTooltip from '@/components/shared/ProgressTooltip';
import type {
  AddWorkOptions,
  TimeEntryItem,
  TimesheetDetail,
  WorkItem,
} from '@/types/timesheet-details';

const INITIAL_WORK_FORM_VALUES = {
  projectId: '',
  typeOfWork: '',
  description: '',
  hours: '',
};

interface TimesheetDetailViewProps {
  orgSlug: string;
  data: TimesheetDetail;
}

export default function TimesheetDetailView({ orgSlug, data }: TimesheetDetailViewProps) {
  // Local state so added works + updated totals render immediately without a reload
  const [detail, setDetail] = useState<TimesheetDetail>(data);
  const options: AddWorkOptions = {
    projects: data.projects,
    workTypes: data.workTypes,
  };
  const [dialogEntry, setDialogEntry] = useState<TimeEntryItem | null>(null);
  const [editingWork, setEditingWork] = useState<WorkItem | null>(null);
  const [workToDelete, setWorkToDelete] = useState<WorkItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // 1. Calculate Target vs Total Percentage Progress
  const totalHours = parseFloat(detail.totalHoursLogged) || 0;
  const targetHours = parseFloat(detail.targetHours) || 40;

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

  useEffect(() => {
    if (dialogEntry) {
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
              hours: '12',
            },
      );
    }
  }, [dialogEntry, editingWork, options.workTypes, reset]);

  const handleSaveWork = handleSubmit((values) => {
    if (!dialogEntry) return;

    const payload = {
      projectId: values.projectId,
      typeOfWork: values.typeOfWork,
      description: values.description,
      hours: Number(values.hours),
    };

    startTransition(async () => {
      try {
        if (editingWork) {
          const result = await timesheetService.updateWork(
            orgSlug,
            detail.id,
            dialogEntry.id,
            editingWork.id,
            payload,
          );

          setDetail((prev) => ({
            ...prev,
            status: result.status,
            totalHoursLogged: result.totalHoursLogged,
            entries: prev.entries.map((entry) =>
              entry.id === dialogEntry.id
                ? {
                    ...entry,
                    works: entry.works.map((work) =>
                      work.id === editingWork.id ? result.data : work,
                    ),
                  }
                : entry,
            ),
          }));

          toast.success('Work updated.');
        } else {
          const result = await timesheetService.addWork(
            orgSlug,
            detail.id,
            dialogEntry.id,
            payload,
          );

          setDetail((prev) => ({
            ...prev,
            status: result.status,
            totalHoursLogged: result.totalHoursLogged,
            entries: prev.entries.map((entry) =>
              entry.id === dialogEntry.id
                ? { ...entry, works: [...entry.works, result.data] }
                : entry,
            ),
          }));

          toast.success(
            `${parseFloat(result.data.hours)} hrs added — ${parseFloat(result.totalHoursLogged)} hrs logged in total`,
          );
        }

        setDialogEntry(null);
        setEditingWork(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to save work. Please try again.',
        );
      }
    });
  });

  const handleDeleteWork = () => {
    if (!workToDelete || !dialogEntry) return;

    startTransition(async () => {
      try {
        const result = await timesheetService.deleteWork(
          orgSlug,
          detail.id,
          dialogEntry.id,
          workToDelete.id,
        );

        setDetail((prev) => ({
          ...prev,
          status: result.status,
          totalHoursLogged: result.totalHoursLogged,
          entries: prev.entries.map((entry) =>
            entry.id === dialogEntry.id
              ? { ...entry, works: entry.works.filter((w) => w.id !== workToDelete.id) }
              : entry,
          ),
        }));

        toast.success(`Work removed — ${parseFloat(result.totalHoursLogged)} hrs logged in total`);
        setWorkToDelete(null);
        setDialogEntry(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to delete work. Please try again.',
        );
      }
    });
  };

  const openCreateDialog = (entry: TimeEntryItem) => {
    setEditingWork(null);
    setDialogEntry(entry);
  };

  const openEditDialog = (entry: TimeEntryItem, work: WorkItem) => {
    setEditingWork(work);
    setDialogEntry(entry);
  };

  const openDeleteDialog = (entry: TimeEntryItem, work: WorkItem) => {
    setDialogEntry(entry);
    setWorkToDelete(work);
  };

  const closeWorkDialog = () => {
    setDialogEntry(null);
    setEditingWork(null);
  };

  return (
    <div className="mx-auto w-full max-w-7xl rounded-lg border border-gray-100 bg-white p-8 shadow-sm">
      {/* Header Section */}
      <div className="flex justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-gray-900">This week’s timesheet</h1>

        {/* Progress Bar Header Component */}
        <div className="w-52">
          <ProgressTooltip currentHours={totalHours} targetHours={targetHours} />
        </div>
      </div>
      <p className="my-4 text-sm text-gray-500">
        {formatRangeSubheader(detail.startDate, detail.endDate, detail.year)}
      </p>

      {/* Daily Entries Timeline */}
      <div className="space-y-6">
        {detail.entries.map((entry) => (
          <div key={entry.id} className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-start">
            {/* Day Column */}
            <div className="pt-2.5 sm:col-span-2">
              <span className="text-lg font-semibold text-gray-900">
                {formatDateHeader(entry.entryDate)}
              </span>
            </div>

            {/* Works List Column */}
            <div className="space-y-2.5 sm:col-span-10">
              {entry.works.map((work) => (
                <div
                  key={work.id}
                  className="group flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-2 shadow-2xs transition-all hover:border-gray-200 hover:shadow-sm"
                >
                  <span className="text-base font-medium text-gray-900">
                    {work.description || work.typeOfWork}
                  </span>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">{parseFloat(work.hours)} hrs</span>
                    <span className="rounded-md bg-[#E1EFFE] px-2.5 py-1 text-xs font-medium text-[#1E429F]">
                      {work.projectName}
                    </span>

                    {/* Action Dropdown Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-32 border-none bg-white shadow-sm"
                      >
                        <DropdownMenuItem
                          onClick={() => openEditDialog(entry, work)}
                          className="cursor-pointer text-sm font-normal text-gray-700 focus:bg-gray-50"
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(entry, work)}
                          className="cursor-pointer text-sm font-normal text-red-600 focus:bg-red-50 focus:text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}

              {/* Add New Task Button Box */}
              <button
                type="button"
                onClick={() => openCreateDialog(entry)}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[#1A56DB] bg-[#E1EFFE] py-2 text-base font-medium text-[#1A56DB] transition-all hover:bg-[#d4e5ff]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add new task</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Work Dialog */}
      <Dialog
        open={!!dialogEntry}
        onOpenChange={(open) => {
          if (!open) closeWorkDialog();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-lg gap-0 overflow-hidden rounded-lg p-0 sm:max-w-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {editingWork ? 'Edit Entry' : 'Add New Entry'}
            </DialogTitle>
            <button
              type="button"
              onClick={closeWorkDialog}
              aria-label="Close"
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSaveWork} noValidate>
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
                          <div className="px-2 py-1.5 text-sm text-gray-400">
                            Loading work types…
                          </div>
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
                  render={({ field }) => {
                    const hoursValue = parseFloat(field.value) || 0;
                    const clampHours = (value: number) =>
                      String(Math.min(24, Math.max(0.5, Math.round(value * 2) / 2)));
                    return (
                      <div className="flex h-9.5 items-stretch overflow-hidden rounded-lg border border-gray-200 bg-white transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <button
                          type="button"
                          onClick={() => field.onChange(clampHours(hoursValue - 0.5))}
                          aria-label="Decrease hours"
                          className="flex w-8.5 shrink-0 items-center justify-center bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          id="work-hours"
                          type="number"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          min={0.5}
                          max={24}
                          step={0.5}
                          className="w-full min-w-0 [appearance:textfield] border-x border-gray-200 bg-white text-center text-sm text-gray-500 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => field.onChange(clampHours(hoursValue + 0.5))}
                          aria-label="Increase hours"
                          className="flex w-8.5 shrink-0 items-center justify-center bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  }}
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
                {isPending
                  ? editingWork
                    ? 'Saving…'
                    : 'Adding…'
                  : editingWork
                    ? 'Save changes'
                    : 'Add entry'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={closeWorkDialog}
                className="h-10 flex-1 rounded-lg border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Work Confirmation Dialog */}
      <Dialog
        open={!!workToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setWorkToDelete(null);
            setDialogEntry(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete work</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this work item? The timesheet total and status will be
              recalculated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setWorkToDelete(null);
                setDialogEntry(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteWork}
              disabled={isPending}
            >
              {isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
