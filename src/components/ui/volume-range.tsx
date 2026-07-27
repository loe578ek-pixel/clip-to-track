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
  const sliderRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);
  const pointerIdRef = React.useRef<number | null>(null);

  const clamp = React.useCallback(
    (n: number) => Math.min(max, Math.max(min, n)),
    [max, min],
  );

  const valueFromClientX = React.useCallback(
    (clientX: number) => {
      const slider = sliderRef.current;
      if (!slider) return min;
      const rect = slider.getBoundingClientRect();
      const percent = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      const raw = min + percent * (max - min);
      const stepped = min + Math.round((raw - min) / step) * step;
      return clamp(stepped);
    },
    [clamp, max, min, step],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = sliderRef.current;
    if (!el) return;
    draggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    e.preventDefault();
    e.stopPropagation();
    onValueChange(valueFromClientX(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    onValueChange(valueFromClientX(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const el = sliderRef.current;
    if (el && pointerIdRef.current !== null) {
      try {
        el.releasePointerCapture(pointerIdRef.current);
      } catch {
        // ignore
      }
    }
    pointerIdRef.current = null;
    e.preventDefault();
    e.stopPropagation();
    onValueChange(valueFromClientX(e.clientX));
  };

  const percentage =
    max > min ? ((clamp(value) - min) / (max - min)) * 100 : 0;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const increment = event.shiftKey ? step * 10 : step;
    let nextValue = value;

    if (event.key === "ArrowRight" || event.key === "ArrowUp")
      nextValue = value + increment;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown")
      nextValue = value - increment;
    else if (event.key === "Home") nextValue = min;
    else if (event.key === "End") nextValue = max;
    else return;

    event.preventDefault();
    onValueChange(clamp(nextValue));
  };

  return (
    <div
      id={id}
      ref={sliderRef}
      role="slider"
      tabIndex={0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        touchAction: "none",
        pointerEvents: "all",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      className={`volume-touch-slider h-8 w-full ${className ?? ""}`.trim()}
    >
      <div
        className="volume-touch-slider__track"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="volume-touch-slider__fill"
          style={{ width: `${percentage}%`, pointerEvents: "none" }}
        />
      </div>
      <div
        className="volume-touch-slider__thumb"
        style={{ left: `${percentage}%`, pointerEvents: "none" }}
      />
    </div>
  );
};
