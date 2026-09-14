'use client';

import { MoreHorizontal, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateHeader, formatRangeSubheader } from '@/lib/helpers';
import type { TimeEntryItem, TimesheetDetail, WorkItem } from '@/types/timesheet-details';

interface TimesheetDetailViewProps {
  data: TimesheetDetail;
}

export default function TimesheetDetailView({ data }: TimesheetDetailViewProps) {
  // 1. Calculate Target vs Total Percentage Progress
  const totalHours = parseFloat(data.totalHoursLogged) || 0;
  const targetHours = parseFloat(data.targetHours) || 40;
  const progressPercent = Math.min(Math.round((totalHours / targetHours) * 100), 100);

  const onAddTask = (_entry: TimeEntryItem) => {};
  const onEditWork = (_work: WorkItem) => {};
  const onDeleteWork = (_workId: string) => {};

  return (
    <div className="mx-auto w-full max-w-7xl rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
      {/* Header Section */}
      <div className="flex justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-gray-900">This week’s timesheet</h1>

        {/* Progress Bar Header Component */}
        <div className="flex flex-col items-end">
          <div className="mb-1.5 flex items-center gap-3 text-xs font-semibold">
            <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
              {totalHours}/{targetHours} hrs
            </span>
            <span className="text-xs font-medium text-gray-500">{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-47 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-orange-500 transition-all duration-300 ease-in-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
      <p className="my-4 text-sm text-gray-500">
        {formatRangeSubheader(data.startDate, data.endDate, data.year)}
      </p>

      {/* Daily Entries Timeline */}
      <div className="space-y-6">
        {data.entries.map((entry) => (
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
                          onClick={() => onEditWork?.(work)}
                          className="cursor-pointer text-sm font-normal text-gray-700 focus:bg-gray-50"
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteWork?.(work.id)}
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
                onClick={() => onAddTask?.(entry)}
                className={`flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[#1A56DB] bg-[#E1EFFE] py-2 text-base font-medium text-[#1A56DB] transition-all`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add new task</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
