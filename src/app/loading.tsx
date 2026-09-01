import Image from "next/image";

export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 text-white select-none overflow-hidden"
      style={{ touchAction: "none" }}
      aria-busy="true"
      aria-label="Loading Road Facing"
    >
      {/* ── Top Slim Glowing Progress Bar ── */}
      <div className="fixed top-0 left-0 right-0 z-[999999] h-[3px] bg-slate-900/40">
        <div className="h-full w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_14px_#f59e0b] animate-pulse" />
      </div>

      {/* ── Ambient Glowing Aura ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[320px] sm:w-[460px] h-[320px] sm:h-[460px] rounded-full bg-gradient-to-tr from-amber-500/20 via-amber-600/10 to-transparent blur-[90px] animate-pulse" />
      </div>

      {/* ── Centered Brand Badge & Animations ── */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 max-w-sm text-center">
        {/* Logo with Orbital Spinning Ring */}
        <div className="relative flex items-center justify-center">
          {/* Outer Dashed Orbit Ring */}
          <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-dashed border-amber-400/40 animate-[spin_4s_linear_infinite]" />

          {/* Inner Glowing Ring */}
          <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-500/15 border border-amber-400/50 blur-xs animate-pulse" />

          {/* Center Brand Logo */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center drop-shadow-[0_0_24px_rgba(245,158,11,0.7)]">
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

        {/* Brand Title */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 font-heading text-xl sm:text-2xl font-black tracking-tight leading-none">
            <span className="text-[#faad13] drop-shadow-[0_0_16px_rgba(250,173,19,0.6)]">ROAD</span>
            <span className="text-white tracking-wider drop-shadow-md">FACING</span>
          </div>
        </div>

        {/* Shimmer Progress Track */}
        <div className="w-36 sm:w-48 h-1.5 bg-slate-800/90 rounded-full overflow-hidden relative shadow-inner border border-slate-700/50">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full shadow-[0_0_12px_#f59e0b] animate-[shimmer_1.5s_infinite_easeInOut]" />
        </div>
      </div>
    </div>
  );
}
