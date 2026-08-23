import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 text-white select-none overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[320px] sm:w-[460px] h-[320px] sm:h-[460px] rounded-full bg-gradient-to-tr from-amber-500/20 via-amber-600/10 to-transparent blur-[90px] animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-4 max-w-sm text-center">
        {/* Animated Brand Logo */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-dashed border-amber-400/40 animate-spin" style={{ animationDuration: "3s" }} />
          <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-500/15 border border-amber-400/50 animate-pulse" />
          
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]">
            <Image
              src="/logo.png"
              alt="ROAD FACING"
              width={64}
              height={64}
              priority
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Brand Text */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 font-heading text-xl sm:text-2xl font-black tracking-tight leading-none">
            <span className="text-[#f59e0b] drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">ROAD</span>
            <span className="text-white tracking-wider">FACING</span>
          </div>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-400 tracking-wide">
            Real Projects. Real People. Real Updates.
          </p>
        </div>

        {/* Shimmer Bar */}
        <div className="w-36 sm:w-44 h-1 bg-slate-800/90 rounded-full overflow-hidden relative shadow-inner">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full animate-pulse shadow-[0_0_10px_#f59e0b]" />
        </div>
      </div>
    </div>
  );
}
