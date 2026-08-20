import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  href?: string;
  isDarkBg?: boolean;
  textColor?: string;
}

const sizeMap = {
  sm: { width: 32, height: 32, textClass: "text-base" },
  md: { width: 42, height: 42, textClass: "text-lg" },
  lg: { width: 54, height: 54, textClass: "text-2xl" },
  xl: { width: 72, height: 72, textClass: "text-3xl" },
};

export function Logo({
  className,
  size = "md",
  showText = true,
  href = "/",
  isDarkBg = false,
  textColor,
}: LogoProps) {
  const { width, height, textClass } = sizeMap[size];

  const resolvedTextColor = textColor || "text-white";
  const resolvedSubtitleColor = textColor ? "text-slate-600 font-bold" : "text-slate-300";

  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex-shrink-0 flex items-center justify-center">
        <Image
          src="/logo.png"
          alt="ROAD FACING Logo"
          width={width}
          height={height}
          className="object-contain w-auto h-auto max-h-[44px] drop-shadow-sm"
          priority
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              "font-heading font-extrabold tracking-tight leading-none flex items-center",
              textClass
            )}
          >
            <span className="text-[#f1a010] font-black">R</span>
            <span className={cn("font-black tracking-tight ml-0.5", resolvedTextColor)}>
              OAD FACING
            </span>
          </span>
          {size !== "sm" && (
            <span
              className={cn(
                "text-[0.5rem] sm:text-[0.55rem] uppercase tracking-[0.18em] leading-none mt-1 font-bold hidden sm:block",
                resolvedSubtitleColor
              )}
            >
              Real Projects. Real People. Real Updates.
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus-visible:outline-none flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
