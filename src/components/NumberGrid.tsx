"use client";

interface NumberGridProps {
  numbers: number[];
  onSelect: (n: number) => void;
  disabledNumbers?: number[];
}

export default function NumberGrid({
  numbers,
  onSelect,
  disabledNumbers = [],
}: NumberGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3 w-full">
      {numbers.map((n) => {
        const disabled = disabledNumbers.includes(n);
        return (
          <button
            key={n}
            onClick={() => !disabled && onSelect(n)}
            disabled={disabled}
            className={`aspect-square rounded-2xl font-mono text-2xl font-semibold flex items-center justify-center transition ${
              disabled
                ? "bg-panel text-text-muted/40 cursor-not-allowed"
                : "bg-panel-raised text-text hover:brightness-110"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
