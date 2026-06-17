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

  const clamp = React.useCallback((nextValue: number) => {
    return Math.min(max, Math.max(min, nextValue));
  }, [max, min]);

  const valueFromClientX = React.useCallback((clientX: number) => {
    const slider = sliderRef.current;
    if (!slider) return value;

    const rect = slider.getBoundingClientRect();
    const percent = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    const rawValue = min + percent * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    return clamp(steppedValue);
  }, [clamp, max, min, step, value]);

  const updateFromTouch = React.useCallback((event: TouchEvent) => {
    const touch = event.touches[0] ?? event.changedTouches[0];
    if (!touch) return;

    event.preventDefault();
    event.stopPropagation();
    onValueChange(valueFromClientX(touch.clientX));
  }, [onValueChange, valueFromClientX]);

  const updateFromMouse = React.useCallback((event: MouseEvent) => {
    event.preventDefault();
    onValueChange(valueFromClientX(event.clientX));
  }, [onValueChange, valueFromClientX]);

  React.useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    let isDragging = false;
    const touchOptions = { passive: false } as AddEventListenerOptions;

    const handleTouchStart = (event: TouchEvent) => {
      isDragging = true;
      updateFromTouch(event);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDragging) return;
      updateFromTouch(event);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!isDragging) return;
      updateFromTouch(event);
      isDragging = false;
    };

    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true;
      updateFromMouse(event);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      updateFromMouse(event);
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    slider.addEventListener("touchstart", handleTouchStart, touchOptions);
    slider.addEventListener("touchmove", handleTouchMove, touchOptions);
    slider.addEventListener("touchend", handleTouchEnd, touchOptions);
    slider.addEventListener("touchcancel", handleTouchEnd, touchOptions);
    slider.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      slider.removeEventListener("touchstart", handleTouchStart, touchOptions);
      slider.removeEventListener("touchmove", handleTouchMove, touchOptions);
      slider.removeEventListener("touchend", handleTouchEnd, touchOptions);
      slider.removeEventListener("touchcancel", handleTouchEnd, touchOptions);
      slider.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [updateFromMouse, updateFromTouch]);

  const percentage = max > min ? ((clamp(value) - min) / (max - min)) * 100 : 0;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const increment = event.shiftKey ? step * 10 : step;
    let nextValue = value;

    if (event.key === "ArrowRight" || event.key === "ArrowUp") nextValue = value + increment;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") nextValue = value - increment;
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
      className={`volume-touch-slider h-8 w-full ${className ?? ""}`.trim()}
    >
      <div className="volume-touch-slider__track">
        <div className="volume-touch-slider__fill" style={{ width: `${percentage}%` }} />
      </div>
      <div className="volume-touch-slider__thumb" style={{ left: `${percentage}%` }} />
    </div>
  );
};