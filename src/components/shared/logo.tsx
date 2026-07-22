import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  href?: string;
  isDarkBg?: boolean;
}

const sizeMap = {
  sm: { width: 28, height: 28, textClass: "text-base" },
  md: { width: 36, height: 36, textClass: "text-lg" },
  lg: { width: 48, height: 48, textClass: "text-2xl" },
  xl: { width: 64, height: 64, textClass: "text-3xl" },
};

export function Logo({
  className,
  size = "md",
  showText = true,
  href = "/",
  isDarkBg = true, // Default true for dark header context
}: LogoProps) {
  const { width, height, textClass } = sizeMap[size];

  const content = (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-shrink-0 rounded-full overflow-hidden">
        <Image
          src="/logooo.jpeg"
          alt="ROAD FACING Logo"
          width={width}
          height={height}
          className="object-cover rounded-full"
          priority
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              "font-heading font-extrabold tracking-tight leading-none",
              textClass
            )}
          >
            <span className="text-amber-400">R</span>
            <span className={isDarkBg ? "text-white" : "text-slate-900"}>
              OAD FACING
            </span>
          </span>
          {size !== "sm" && (
            <span className="text-[0.5rem] sm:text-[0.55rem] uppercase tracking-[0.18em] text-slate-400 leading-none mt-1 font-semibold hidden sm:block">
              Real Owner Agent Developer
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
