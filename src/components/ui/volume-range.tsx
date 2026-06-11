import * as React from "react";

interface VolumeRangeProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  id?: string;
  className?: string;
  ariaLabel?: string;
}

export const VolumeRange = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  id,
  className,
  ariaLabel,
}: VolumeRangeProps) => {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onValueChange(Number(event.target.value))}
      className={`h-6 w-full cursor-pointer touch-manipulation accent-primary bg-transparent ${className ?? ""}`.trim()}
    />
  );
};