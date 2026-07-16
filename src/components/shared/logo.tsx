import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  href?: string;
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
}: LogoProps) {
  const { width, height, textClass } = sizeMap[size];

  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
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
              "font-heading font-bold tracking-tight leading-none",
              textClass
            )}
          >
            <span className="text-amber-primary">R</span>
            <span className="text-text-primary">OAD FACING</span>
          </span>
          {size !== "sm" && (
            <span className="text-[0.55rem] uppercase tracking-[0.2em] text-text-tertiary leading-none mt-0.5">
              Real Owner Agent Developer
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus-visible:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
