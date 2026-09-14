'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { timesheetService } from '@/services/timesheet';
import type { AddWorkFormData } from '@/lib/validations/timesheet';
import type {
  AddWorkOptions,
  TimeEntryItem,
  TimesheetDetail,
  WorkItem,
} from '@/types/timesheet-details';
import { TimesheetDetailsHeader } from './details/TimesheetDetailsHeader';
import { DayColumn } from './details/DayColumn';
import { WorkEditorDialog } from './details/WorkEditorDialog';
import { DeleteWorkDialog } from './details/DeleteWorkDialog';

interface TimesheetDetailViewProps {
  orgSlug: string;
  data: TimesheetDetail;
}

export default function TimesheetDetailView({ orgSlug, data }: TimesheetDetailViewProps) {
  // Local state so added works + updated totals render immediately without a reload
  const [detail, setDetail] = useState<TimesheetDetail>(data);
  const [dialogEntry, setDialogEntry] = useState<TimeEntryItem | null>(null);
  const [editingWork, setEditingWork] = useState<WorkItem | null>(null);
  const [workToDelete, setWorkToDelete] = useState<WorkItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const options: AddWorkOptions = {
    projects: data.projects,
    workTypes: data.workTypes,
  };

  // Target vs Total progress
  const totalHours = parseFloat(detail.totalHoursLogged) || 0;
  const targetHours = parseFloat(detail.targetHours) || 40;

  const handleSaveWork = (values: AddWorkFormData) => {
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
  };

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

  return (
    <div className="mx-auto w-full max-w-7xl rounded-lg border border-gray-100 bg-white p-8 shadow-sm">
      <TimesheetDetailsHeader
        totalHours={totalHours}
        targetHours={targetHours}
        startDate={detail.startDate}
        endDate={detail.endDate}
        year={detail.year}
      />

      {/* Daily Entries Timeline */}
      <div className="space-y-6">
        {detail.entries.map((entry) => (
          <DayColumn
            key={entry.id}
            entry={entry}
            onAddWork={() => openCreateDialog(entry)}
            onEditWork={(work) => openEditDialog(entry, work)}
            onDeleteWork={(work) => openDeleteDialog(entry, work)}
          />
        ))}
      </div>

      <WorkEditorDialog
        open={!!dialogEntry && !workToDelete}
        editingWork={editingWork}
        options={options}
        isPending={isPending}
        onClose={() => {
          setDialogEntry(null);
          setEditingWork(null);
        }}
        onSubmit={handleSaveWork}
      />

      <DeleteWorkDialog
        open={!!workToDelete}
        isPending={isPending}
        onCancel={() => {
          setWorkToDelete(null);
          setDialogEntry(null);
        }}
        onConfirm={handleDeleteWork}
      />
    </div>
  );
}
