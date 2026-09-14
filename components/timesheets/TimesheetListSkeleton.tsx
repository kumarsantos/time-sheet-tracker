const HEADER_LABELS = ['WEEK #', 'DATE', 'STATUS', 'ACTIONS'];
const SKELETON_ROWS = Array.from({ length: 8 }, (_, i) => i);

const TimesheetListSkeleton = () => {
  return (
    <div className="min-h-screen p-6 px-32">
      <div className="mx-auto w-full space-y-4 rounded-lg bg-white p-6 shadow">
        <div className="h-8 w-56 animate-pulse rounded-md bg-gray-200" />

        <div className="flex items-center gap-2">
          <div className="h-10 w-48 animate-pulse rounded-md bg-gray-200" />
          <div className="h-10 w-32 animate-pulse rounded-md bg-gray-200" />
        </div>

        <div className="w-full space-y-2">
          <div className="overflow-x-auto rounded-xl bg-white shadow transition-opacity">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                  {HEADER_LABELS.map((label, index) => (
                    <th
                      key={label}
                      className={`px-6 py-4 text-xs font-semibold text-gray-500 ${
                        index === 3 ? 'text-right' : ''
                      } ${index === 0 ? 'bg-gray-50' : ''}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {SKELETON_ROWS.map((row) => (
                  <tr key={row} className="border-b border-gray-200 transition-colors">
                    <td
                      className={`px-6 py-4 font-normal text-gray-900 ${row % 2 === 0 ? 'bg-gray-50' : ''}`}
                    >
                      <div className="h-4 w-8 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4 font-normal text-gray-900">
                      <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="px-6 py-4 font-normal text-gray-900">
                      <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
                    </td>
                    <td className="px-6 py-4 text-right font-normal text-gray-900">
                      <div className="ml-auto h-4 w-12 animate-pulse rounded bg-gray-200" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-4 pt-2">
            <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1 text-xs font-medium shadow-xs">
              <div className="h-7 w-16 animate-pulse rounded-lg bg-gray-200" />
              <div className="flex items-center space-x-0.5 px-1">
                {[0, 1, 2, 3].map((dot) => (
                  <div key={dot} className="h-7 w-7 animate-pulse rounded-lg bg-gray-200" />
                ))}
              </div>
              <div className="h-7 w-12 animate-pulse rounded-lg bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetListSkeleton;
