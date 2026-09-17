"use client";

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export default function Slider({ label, value, onChange }: SliderProps) {
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-text text-base font-medium">{label}</span>
        <span className="font-mono text-2xl text-accent-light tabular-nums">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-3 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-runnable-track]:rounded-full
          [&::-webkit-slider-runnable-track]:h-3
          [&::-moz-range-track]:rounded-full
          [&::-moz-range-track]:h-3
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-6
          [&::-webkit-slider-thumb]:h-6
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(237,239,250,0.15)]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:-mt-[calc((24px-12px)/2)]
          [&::-moz-range-thumb]:w-6
          [&::-moz-range-thumb]:h-6
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer"
        style={{
          touchAction: "pan-y",
          background: "linear-gradient(90deg, #8FD9FF 0%, #FFB86B 100%)",
        }}
      />
      <div className="flex justify-between text-xs text-text-muted mt-1">
        <span>1 · faible</span>
        <span>10 · élevé</span>
      </div>
    </div>
  );
}
