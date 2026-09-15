const SKELETON_DAYS = Array.from({ length: 5 }, (_, i) => i);
const SKELETON_WORKS = Array.from({ length: 2 }, (_, i) => i);

const TimesheetDetailsSkeleton = () => {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-32">
      <div className="mx-auto w-full max-w-7xl rounded-lg border border-gray-100 bg-white p-4 shadow-sm sm:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-8 w-56 animate-pulse rounded-md bg-gray-200" />

          {/* Progress tooltip header */}
          <div className="w-full sm:w-52">
            <div className="relative w-full">
              <div className="absolute -top-12 left-[70%] z-10 hidden -translate-x-1/2 rounded-2xl bg-gray-200 px-4 py-2 shadow-lg sm:block">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-300/70" />
              </div>
              <div className="h-2.5 w-full animate-pulse rounded-full bg-gray-200">
                <div className="h-full w-[70%] rounded-full bg-gray-300/70" />
              </div>
            </div>
            <div className="pt-2 text-right">
              <div className="ml-auto h-4 w-12 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <div className="my-4 h-4 w-64 animate-pulse rounded bg-gray-200" />

        {/* Daily entries timeline */}
        <div className="space-y-6">
          {SKELETON_DAYS.map((day) => (
            <div key={day} className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-start">
              <div className="pt-2.5 sm:col-span-2">
                <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
              </div>

              <div className="space-y-2.5 sm:col-span-10">
                {SKELETON_WORKS.map((work) => (
                  <div
                    key={work}
                    className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-2 shadow-2xs"
                  >
                    <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />

                    <div className="flex items-center gap-3">
                      <div className="h-4 w-10 animate-pulse rounded bg-gray-200" />
                      <div className="h-5 w-24 animate-pulse rounded-md bg-gray-200" />
                      <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                ))}

                <div className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[#1A56DB]/40 bg-[#E1EFFE]/50 py-2">
                  <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimesheetDetailsSkeleton;
