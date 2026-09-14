'use client';

interface ProgressTooltipProps {
  currentHours: number;
  targetHours: number;
  maxPercentageLabel?: string;
}

/**
 * Floating speech-bubble tooltip paired with a rounded progress track. The
 * bubble is anchored to the right edge of the filled indicator and the caret
 * always points precisely at the fill tip.
 */
export default function ProgressTooltip({
  currentHours,
  targetHours,
  maxPercentageLabel,
}: ProgressTooltipProps) {
  const percentage =
    targetHours > 0
      ? Math.min(100, Math.max(0, Math.round((currentHours / targetHours) * 100)))
      : 0;

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="relative w-full">
        {/* Floating speech-bubble tooltip */}
        <div
          className="absolute -top-12 z-10 -translate-x-1/2 rounded-sm bg-white px-4 py-2 shadow-lg"
          style={{ left: `${percentage}%` }}
        >
          <span className="text-sm font-semibold whitespace-nowrap text-slate-900">
            {currentHours}/{targetHours} hrs
          </span>
          {/* Caret anchoring the bubble to the fill tip */}
          <div className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-white shadow-lg" />
        </div>

        {/* Progress track */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-[#FF7A50] transition-all duration-300 ease-in-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Percentage label, right-aligned to the track end */}
      <p className="text-right text-sm font-medium text-slate-500">
        {maxPercentageLabel ?? `${percentage}%`}
      </p>
    </div>
  );
}
