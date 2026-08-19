"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    rangeClassName?: string;
    thumbClassName?: string;
    trackClassName?: string;
  }
>(({ className, rangeClassName, thumbClassName, trackClassName, ...props }, ref) => {
  // Support dual-handle (range) sliders by rendering one Thumb per value
  const values = Array.isArray(props.value)
    ? props.value
    : props.defaultValue ?? [0];

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center py-2",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          "relative h-1.5 w-full grow overflow-hidden rounded-full bg-slate-200",
          trackClassName
        )}
      >
        <SliderPrimitive.Range
          className={cn("absolute h-full bg-[#008075]", rangeClassName)}
        />
      </SliderPrimitive.Track>
      {values.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className={cn(
            "block h-5 w-5 rounded-full border-2 border-[#008075] bg-white shadow-sm ring-offset-background transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing",
            thumbClassName
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
