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
  sm: { iconHeight: 26, textClass: "text-base" },
  md: { iconHeight: 32, textClass: "text-lg sm:text-xl" },
  lg: { iconHeight: 42, textClass: "text-2xl" },
  xl: { iconHeight: 52, textClass: "text-3xl" },
};

export function Logo({
  className,
  size = "md",
  showText = true,
  href = "/",
  textColor,
}: LogoProps) {
  const { iconHeight, textClass } = sizeMap[size];
  const resolvedTextColor = textColor || "text-white";

  const content = (
    <div className={cn("flex items-center gap-2.5 group select-none", className)}>
      <div 
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{ height: `${iconHeight}px` }}
      >
        <Image
          src="/logo.png"
          alt="ROAD FACING Logo"
          width={Math.round(iconHeight * 0.73)}
          height={iconHeight}
          className="h-full w-auto object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
          priority
        />
      </div>
      {showText && (
        <div className="flex flex-col justify-center">
          <div
            className={cn(
              "font-heading font-black tracking-tight leading-none flex items-center gap-1",
              textClass
            )}
          >
            <span className="text-[#f59e0b] font-black">ROAD</span>
            <span className={cn("font-black tracking-tight", resolvedTextColor)}>
              FACING
            </span>
          </div>
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
