"use client";

import type { RatingValues } from "@/lib/types";

interface BeforeAfterChartProps {
  avgBefore: RatingValues;
  avgAfter: RatingValues;
  delta: RatingValues;
}

const METRICS: { key: keyof RatingValues; label: string }[] = [
  { key: "stress", label: "Stress" },
  { key: "fatigue_nerveuse", label: "Fatigue nerveuse et émotionnelle" },
  { key: "fatigue_physique", label: "Fatigue physique" },
];

const CHART_HEIGHT = 180;
const GROUP_WIDTH = 110;
const BAR_WIDTH = 34;
const CHART_TOP_PAD = 24;

export default function BeforeAfterChart({
  avgBefore,
  avgAfter,
  delta,
}: BeforeAfterChartProps) {
  const chartWidth = METRICS.length * GROUP_WIDTH + 40;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1 min-w-0 overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT + CHART_TOP_PAD + 30}`}
          className="w-full"
          style={{ minWidth: 280 }}
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
              y1={CHART_TOP_PAD + CHART_HEIGHT}
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
            const beforeVal = avgBefore[metric.key];
            const afterVal = avgAfter[metric.key];
            const beforeH = (beforeVal / 10) * CHART_HEIGHT;
            const afterH = (afterVal / 10) * CHART_HEIGHT;
            const baseY = CHART_TOP_PAD + CHART_HEIGHT;

            return (
              <g key={metric.key}>
                <rect
                  x={groupX}
                  y={baseY - beforeH}
                  width={BAR_WIDTH}
                  height={beforeH}
                  rx={4}
                  fill="url(#severity-gradient)"
                />
                <text
                  x={groupX + BAR_WIDTH / 2}
                  y={baseY - beforeH - 6}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#EDEFFA"
                  fontFamily="var(--font-jetbrains-mono), monospace"
                >
                  {beforeVal.toFixed(1)}
                </text>

                <rect
                  x={groupX + BAR_WIDTH + 8}
                  y={baseY - afterH}
                  width={BAR_WIDTH}
                  height={afterH}
                  rx={4}
                  fill="url(#severity-gradient)"
                />
                <text
                  x={groupX + BAR_WIDTH + 8 + BAR_WIDTH / 2}
                  y={baseY - afterH - 6}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#EDEFFA"
                  fontFamily="var(--font-jetbrains-mono), monospace"
                >
                  {afterVal.toFixed(1)}
                </text>

                <text
                  x={groupX + BAR_WIDTH + 4}
                  y={baseY + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#8B92B8"
                >
                  <tspan x={groupX + BAR_WIDTH + 4} dy={0}>
                    {metric.label.length > 16
                      ? metric.label.slice(0, 14) + "…"
                      : metric.label}
                  </tspan>
                </text>
              </g>
            );
          })}
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
      </div>
    </div>
  );
}
