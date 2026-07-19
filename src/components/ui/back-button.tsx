"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className }: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.back()}
      className={cn("rounded-full hover:bg-bg-card active:bg-bg-card/80 transition-colors", className)}
      aria-label="Go back"
    >
      <ArrowLeft className="w-6 h-6 text-text-primary" />
    </Button>
  );
}
