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
        className="w-full h-3 rounded-full appearance-none cursor-pointer bg-panel-raised accent-[#8fd9ff]"
        style={{ touchAction: "pan-y" }}
      />
      <div className="flex justify-between text-xs text-text-muted mt-1">
        <span>1</span>
        <span>10</span>
      </div>
    </div>
  );
}
