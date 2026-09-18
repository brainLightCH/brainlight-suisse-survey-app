"use client";

import type { RatingValues } from "@/lib/types";

interface BeforeAfterChartProps {
  avgBefore: RatingValues;
  avgAfter: RatingValues;
  delta: RatingValues;
  avgUsageLikelihood?: number | null;
}

const METRICS: { key: keyof RatingValues; label: string }[] = [
  { key: "stress", label: "Stress" },
  { key: "fatigue_nerveuse", label: "Fatigue nerveuse et émotionnelle" },
  { key: "fatigue_physique", label: "Fatigue physique" },
];

const USAGE_LABEL = "Probabilité d'utilisation";

function wrapLabel(label: string, maxCharsPerLine = 18): string[] {
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const CHART_HEIGHT = 180;
const GROUP_WIDTH = 130;
const BAR_WIDTH = 34;
const CHART_TOP_PAD = 24;
const LABEL_LINE_HEIGHT = 12;

function LabelText({ x, y, label }: { x: number; y: number; label: string }) {
  const lines = wrapLabel(label);
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={10} fill="#8B92B8">
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : LABEL_LINE_HEIGHT}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function ValueBar({
  x,
  width,
  value,
  baseY,
}: {
  x: number;
  width: number;
  value: number;
  baseY: number;
}) {
  const h = (value / 10) * CHART_HEIGHT;
  return (
    <>
      <rect
        x={x}
        y={baseY - h}
        width={width}
        height={h}
        rx={4}
        fill="url(#severity-gradient)"
      />
      <text
        x={x + width / 2}
        y={baseY - h - 6}
        textAnchor="middle"
        fontSize={11}
        fill="#EDEFFA"
        fontFamily="var(--font-jetbrains-mono), monospace"
      >
        {value.toFixed(1)}
      </text>
    </>
  );
}

export default function BeforeAfterChart({
  avgBefore,
  avgAfter,
  delta,
  avgUsageLikelihood,
}: BeforeAfterChartProps) {
  const hasUsage = typeof avgUsageLikelihood === "number";
  const groupCount = METRICS.length + (hasUsage ? 1 : 0);
  const chartWidth = groupCount * GROUP_WIDTH + 40;
  const baseY = CHART_TOP_PAD + CHART_HEIGHT;
  const labelY = baseY + 18;
  const svgHeight = baseY + 18 + LABEL_LINE_HEIGHT * 2 + 6;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1 min-w-0 overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${svgHeight}`}
          className="w-full"
          style={{ minWidth: 320 }}
          role="img"
          aria-label="Comparaison avant/après par indicateur"
        >
          <defs>
            {/* One fixed gradient across the whole 0-10 axis — every bar
                reads from the same absolute scale (userSpaceOnUse, not
                objectBoundingBox), so a short bar just reveals the green
                end and a tall bar reveals further up toward red, instead
                of each bar getting its own single solid color. */}
            <linearGradient
              id="severity-gradient"
              gradientUnits="userSpaceOnUse"
              x1={0}
              y1={baseY}
              x2={0}
              y2={CHART_TOP_PAD}
            >
              <stop offset="0%" stopColor="hsl(130, 70%, 48%)" />
              <stop offset="50%" stopColor="hsl(65, 70%, 48%)" />
              <stop offset="100%" stopColor="hsl(0, 70%, 48%)" />
            </linearGradient>
          </defs>

          {[0, 2, 4, 6, 8, 10].map((tick) => {
            const y = CHART_TOP_PAD + CHART_HEIGHT - (tick / 10) * CHART_HEIGHT;
            return (
              <g key={tick}>
                <line
                  x1={32}
                  x2={chartWidth}
                  y1={y}
                  y2={y}
                  stroke="#8B92B8"
                  strokeOpacity={0.15}
                />
                <text
                  x={26}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="#8B92B8"
                  fontFamily="var(--font-jetbrains-mono), monospace"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {METRICS.map((metric, i) => {
            const groupX = 40 + i * GROUP_WIDTH;
            const groupCenter = groupX + (BAR_WIDTH * 2 + 8) / 2;

            return (
              <g key={metric.key}>
                <ValueBar
                  x={groupX}
                  width={BAR_WIDTH}
                  value={avgBefore[metric.key]}
                  baseY={baseY}
                />
                <ValueBar
                  x={groupX + BAR_WIDTH + 8}
                  width={BAR_WIDTH}
                  value={avgAfter[metric.key]}
                  baseY={baseY}
                />
                <LabelText x={groupCenter} y={labelY} label={metric.label} />
              </g>
            );
          })}

          {hasUsage && (
            <g>
              {(() => {
                const groupX = 40 + METRICS.length * GROUP_WIDTH;
                const barX = groupX + (BAR_WIDTH * 2 + 8 - BAR_WIDTH) / 2;
                const groupCenter = groupX + (BAR_WIDTH * 2 + 8) / 2;
                return (
                  <>
                    <ValueBar
                      x={barX}
                      width={BAR_WIDTH}
                      value={avgUsageLikelihood as number}
                      baseY={baseY}
                    />
                    <LabelText
                      x={groupCenter}
                      y={labelY}
                      label={USAGE_LABEL}
                    />
                  </>
                );
              })()}
            </g>
          )}
        </svg>

        <div className="flex items-center gap-3 mt-2 px-2">
          <span className="text-xs text-text-muted">0</span>
          <div
            className="h-2 flex-1 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, hsl(130,70%,48%), hsl(65,70%,48%), hsl(0,70%,48%))",
            }}
          />
          <span className="text-xs text-text-muted">10</span>
        </div>
        <div className="flex items-center gap-4 mt-2 px-2 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-text-muted/50" /> Avant
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-text-muted/20" /> Après
          </span>
        </div>
      </div>

      <div className="flex flex-row md:flex-col gap-4 md:gap-6 md:w-44 shrink-0 flex-wrap">
        {METRICS.map((metric) => (
          <div key={metric.key}>
            <p className="text-xs text-text-muted">{metric.label}</p>
            <p
              className={`font-mono text-2xl font-semibold ${
                delta[metric.key] <= 0 ? "text-success" : "text-accent-energy"
              }`}
            >
              {delta[metric.key] > 0 ? "+" : ""}
              {delta[metric.key].toFixed(0)}%
            </p>
          </div>
        ))}
        {hasUsage && (
          <div>
            <p className="text-xs text-text-muted">{USAGE_LABEL}</p>
            <p className="font-mono text-2xl font-semibold text-accent-light">
              {(avgUsageLikelihood as number).toFixed(1)}/10
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
