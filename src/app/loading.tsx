export default function Loading() {
  return (
    <div className="min-h-[50vh] w-full flex items-center justify-center p-6" aria-busy="true" aria-label="Loading page">
      {/* Top Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 z-[999999] h-[3px] bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_12px_#f59e0b] animate-pulse" />

      {/* Lightweight Centered Brand Pulse */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">
          Loading Road Facing...
        </span>
      </div>
    </div>
  );
}
