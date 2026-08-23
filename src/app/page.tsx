import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, Clock3, Mail, MapPin, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Road Facing | Launching Soon",
  description:
    "Road Facing is launching soon with verified projects, real people, and real on-ground property updates across Andhra Pradesh.",
};

const launchSignals = [
  {
    label: "Verified Projects",
    detail: "RERA, CRDA, and field-checked listings",
    Icon: ShieldCheck,
  },
  {
    label: "AP Capital Region",
    detail: "Vijayawada, Guntur, Amaravati, and more",
    Icon: MapPin,
  },
  {
    label: "Launch Window",
    detail: "Opening the road soon",
    Icon: Clock3,
  },
];

export default function HomePage() {
  return (
    <section className="fixed inset-0 isolate overflow-y-auto bg-[#050505] text-white">
      <style>{`
        @keyframes launchReveal {
          from { opacity: 0; transform: translateY(18px); filter: blur(10px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        @keyframes launchGridDrift {
          from { background-position: 0 0, 0 0; }
          to { background-position: 72px 72px, -72px 72px; }
        }

        @keyframes launchLane {
          from { transform: translateY(-135%); opacity: 0; }
          15% { opacity: 1; }
          82% { opacity: 1; }
          to { transform: translateY(540%); opacity: 0; }
        }

        @keyframes launchOrbit {
          to { transform: rotate(360deg); }
        }

        @keyframes launchCounterOrbit {
          to { transform: rotate(-360deg); }
        }

        @keyframes launchLogoBreathe {
          0%, 100% {
            transform: translateY(0) scale(1);
            filter: drop-shadow(0 0 30px rgba(241, 160, 16, 0.62));
          }
          50% {
            transform: translateY(-10px) scale(1.035);
            filter: drop-shadow(0 0 48px rgba(241, 160, 16, 0.9));
          }
        }

        @keyframes launchSweep {
          from { transform: translateX(-125%); }
          to { transform: translateX(125%); }
        }

        @keyframes launchPulse {
          0%, 100% { opacity: 0.72; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }

        @keyframes launchFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }

        .launch-reveal {
          animation: launchReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .launch-grid {
          animation: launchGridDrift 18s linear infinite;
        }

        .launch-lane {
          animation: launchLane 2.7s linear infinite;
        }

        .launch-lane:nth-child(2) {
          animation-delay: 0.86s;
        }

        .launch-lane:nth-child(3) {
          animation-delay: 1.72s;
        }

        .launch-orbit {
          animation: launchOrbit 18s linear infinite;
        }

        .launch-orbit-alt {
          animation: launchCounterOrbit 12s linear infinite;
        }

        .launch-logo {
          animation: launchLogoBreathe 4.6s ease-in-out infinite;
        }

        .launch-sweep {
          animation: launchSweep 2.2s ease-in-out infinite;
        }

        .launch-pulse {
          animation: launchPulse 2.4s ease-in-out infinite;
        }

        .launch-float {
          animation: launchFloat 6s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .launch-reveal,
          .launch-grid,
          .launch-lane,
          .launch-orbit,
          .launch-orbit-alt,
          .launch-logo,
          .launch-sweep,
          .launch-pulse,
          .launch-float {
            animation: none !important;
          }
        }
      `}</style>
      <div className="relative min-h-svh overflow-hidden">
        <div
          className="absolute inset-0 bg-[linear-gradient(118deg,rgba(241,160,16,0.22),transparent_34%),linear-gradient(180deg,#050505_0%,#09110f_56%,#061612_100%)]"
          aria-hidden="true"
        />
        <div
          className="launch-grid absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:72px_72px]"
          aria-hidden="true"
        />
        <div
          className="absolute left-[-30%] top-[18%] h-px w-[115%] rotate-12 overflow-hidden bg-white/10 sm:left-[-18%] sm:top-[14%] sm:w-[70%]"
          aria-hidden="true"
        >
          <span className="launch-sweep block h-full w-1/2 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
        </div>
        <div
          className="absolute bottom-[26%] right-[-48%] h-px w-[125%] rotate-12 overflow-hidden bg-emerald-300/10 sm:bottom-[18%] sm:right-[-22%] sm:w-[82%]"
          aria-hidden="true"
        >
          <span className="launch-sweep block h-full w-1/2 bg-gradient-to-r from-transparent via-emerald-200 to-transparent [animation-delay:1.1s]" />
        </div>
        <div
          className="absolute left-[86%] top-[-12%] h-[130%] w-20 -translate-x-1/2 rotate-12 overflow-hidden border-x border-white/10 bg-white/[0.025] opacity-80 shadow-[0_0_80px_rgba(241,160,16,0.16)] sm:left-1/2 sm:w-32 sm:opacity-100 lg:w-44"
          aria-hidden="true"
        >
          <span className="launch-lane absolute left-1/2 top-0 h-24 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-transparent via-amber-300 to-transparent shadow-[0_0_18px_rgba(241,160,16,0.8)]" />
          <span className="launch-lane absolute left-1/2 top-0 h-24 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-transparent via-amber-300 to-transparent shadow-[0_0_18px_rgba(241,160,16,0.8)]" />
          <span className="launch-lane absolute left-1/2 top-0 h-24 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-transparent via-amber-300 to-transparent shadow-[0_0_18px_rgba(241,160,16,0.8)]" />
          <div className="mx-auto h-full w-[3px] bg-amber-300/10" />
        </div>
        <div className="absolute right-[-140px] top-16 hidden h-[520px] w-[380px] opacity-[0.07] lg:block" aria-hidden="true">
          <Image
            src="/logo.png"
            alt=""
            fill
            priority
            sizes="380px"
            className="object-contain"
          />
        </div>

        <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-4 sm:px-8 sm:py-7 lg:px-12">
          <header className="launch-reveal flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Road Facing logo"
                width={34}
                height={46}
                priority
                className="h-10 w-auto object-contain sm:h-11"
              />
              <div>
                <p className="text-base font-black leading-none text-white sm:text-lg">Road Facing</p>
              </div>
            </div>
            <a
              href="mailto:care@roadfacing.com"
              className="hidden items-center gap-2 rounded-full border border-white/[0.15] bg-white/[0.08] px-4 py-2 text-sm font-bold text-white transition hover:border-amber-300 hover:bg-amber-300 hover:text-black sm:inline-flex"
            >
              <Mail className="h-4 w-4" />
              Contact
            </a>
          </header>

          <main className="grid flex-1 items-center gap-6 py-7 sm:gap-10 sm:py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-14">
            <div className="order-2 mx-auto max-w-3xl text-center lg:order-1 lg:mx-0 lg:text-left">
              <div className="launch-reveal inline-flex items-center gap-2 rounded-md border border-amber-300/[0.35] bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-200 shadow-[0_0_32px_rgba(241,160,16,0.22)] [animation-delay:0.08s]">
                <span className="launch-pulse h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(241,160,16,0.9)]" />
                Launching Soon
              </div>

              <h1 className="launch-reveal mt-5 max-w-3xl text-4xl font-black leading-none text-white sm:mt-7 sm:text-7xl lg:text-8xl [animation-delay:0.16s]">
                Road Facing
              </h1>
              <p className="launch-reveal mt-4 max-w-2xl text-2xl font-black leading-tight text-amber-300 sm:mt-5 sm:text-4xl [animation-delay:0.24s]">
                Launching soon.
              </p>
              <p className="launch-reveal mx-auto mt-4 max-w-md text-xs font-medium leading-5 text-white/60 sm:mt-5 sm:text-sm lg:mx-0 [animation-delay:0.32s]">
                Verified property updates across the AP capital region.
              </p>

              <div className="launch-reveal mx-auto mt-6 max-w-xl sm:mt-8 lg:mx-0 [animation-delay:0.4s]">
                <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.18em] text-white/52">
                  <span>Preparing launch</span>
                  <span className="text-amber-300">Soon</span>
                </div>
                <div className="relative mt-3 h-2 overflow-hidden rounded-md bg-white/10">
                  <div className="h-full w-3/4 rounded-md bg-gradient-to-r from-amber-500 via-amber-300 to-emerald-200 shadow-[0_0_22px_rgba(241,160,16,0.45)]" />
                  <span className="launch-sweep absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                </div>
              </div>

              <div className="launch-reveal mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-center lg:justify-start [animation-delay:0.48s]">
                <a
                  href="mailto:care@roadfacing.com"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-300 px-6 py-3 text-sm font-black text-black shadow-[0_18px_50px_rgba(241,160,16,0.28)] transition hover:-translate-y-0.5 hover:bg-white"
                >
                  Get Launch Updates
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <a
                  href="mailto:care@roadfacing.com?subject=Road%20Facing%20partnership"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-white/[0.15] bg-white/[0.08] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/[0.12]"
                >
                  Partner With Us
                </a>
              </div>
            </div>

            <div className="launch-reveal order-1 flex justify-center lg:order-2 lg:justify-end [animation-delay:0.22s]">
              <div className="launch-float relative aspect-square w-[min(52vw,210px)] sm:w-[min(62vw,300px)] lg:w-[min(72vw,340px)]">
                <div className="launch-orbit absolute inset-0 rotate-6 border border-amber-300/25 bg-black/25 shadow-[0_0_70px_rgba(241,160,16,0.2)]" />
                <div className="launch-orbit-alt absolute inset-5 -rotate-3 border border-white/[0.12] bg-white/[0.03]" />
                <div className="absolute inset-6 border border-emerald-200/20 bg-emerald-200/[0.025] sm:inset-10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="Road Facing road mark"
                    width={210}
                    height={288}
                    priority
                    className="launch-logo h-[72%] w-auto object-contain"
                  />
                </div>
              </div>
            </div>
          </main>

          <footer className="grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3 sm:gap-4 sm:pt-5">
            {launchSignals.map(({ label, detail, Icon }, index) => (
              <div
                key={label}
                className="launch-reveal flex items-start gap-3"
                style={{ animationDelay: `${0.54 + index * 0.08}s` }}
              >
                <div className="launch-pulse flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/[0.12] bg-white/[0.08] text-amber-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">{label}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-white/[0.58] sm:text-sm">{detail}</p>
                </div>
              </div>
            ))}
          </footer>
        </div>
      </div>
    </section>
  );
}
