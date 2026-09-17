"use client";

interface NumberGridProps {
  numbers: number[];
  onSelect: (n: number) => void;
  takenBefore?: number[];
}

export default function NumberGrid({
  numbers,
  onSelect,
  takenBefore = [],
}: NumberGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3 w-full">
      {numbers.map((n) => {
        const done = takenBefore.includes(n);
        return (
          <button
            key={n}
            onClick={() => onSelect(n)}
            className={`aspect-square rounded-2xl font-mono text-2xl font-semibold flex items-center justify-center transition ${
              done
                ? "bg-panel text-text-muted border border-success/50"
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
