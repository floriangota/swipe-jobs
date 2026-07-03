"use client";

import { cn } from "@/lib/utils/cn";

export interface ChipOption {
  value: string;
  label: string;
}

interface ChipGroupProps {
  options: ChipOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** false = single-select (radio-like). Default true (multi-select). */
  multiple?: boolean;
  /** cap for multi-select. */
  max?: number;
  className?: string;
  /** Accessible name for the group (screen readers otherwise announce an unnamed group). */
  ariaLabel?: string;
}

/** Toggleable chips for single or multi selection (categories, languages, etc.). */
export function ChipGroup({
  options,
  value,
  onChange,
  multiple = true,
  max,
  className,
  ariaLabel,
}: ChipGroupProps) {
  function toggle(v: string) {
    if (value.includes(v)) {
      onChange(multiple ? value.filter((x) => x !== v) : []);
      return;
    }
    if (!multiple) {
      onChange([v]);
      return;
    }
    if (max && value.length >= max) return;
    onChange([...value, v]);
  }

  return (
    <div role="group" aria-label={ariaLabel} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ease-standard",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary bg-primary/10 text-foreground"
                : "border-input text-muted-foreground hover:bg-secondary",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
