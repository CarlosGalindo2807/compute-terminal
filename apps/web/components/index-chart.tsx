// Server-rendered 90-day VWAP chart for /index/[slug].
// Plain SVG — keeps the page a pure RSC, no client bundle.
//
// The watermark in the bottom-right is the published methodology contract:
// every chart on this site reads from the same `filtered_vwap v1.0` series
// stamped on `index_values_daily` rows. If the watermark ever shows a
// different version, the methodology committee approved a change.

interface Point {
  date: string;
  vwap: number;
  methodology_version?: string | null;
}

const W = 880;
const H = 340;
const PAD = { top: 16, right: 16, bottom: 36, left: 60 };
const innerW = W - PAD.left - PAD.right;
const innerH = H - PAD.top - PAD.bottom;

export function IndexChart({
  values,
  watermark,
  positive = true,
}: {
  values: Point[];
  watermark: string;
  positive?: boolean;
}) {
  if (values.length < 2) {
    return (
      <div className="flex h-[340px] items-center justify-center rounded border border-bg-border bg-bg-surface">
        <p className="mono text-2xs uppercase tracking-wider text-ink-muted">
          Need ≥ 2 daily values to render
        </p>
      </div>
    );
  }

  const prices = values.map((v) => v.vwap);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || max || 1;
  // Pad the y range by 5% so the line never kisses the top/bottom border.
  const yMin = min - range * 0.05;
  const yMax = max + range * 0.05;
  const ySpan = yMax - yMin;

  const t0 = new Date(values[0]!.date).getTime();
  const tN = new Date(values[values.length - 1]!.date).getTime();
  const tSpan = Math.max(1, tN - t0);

  const x = (d: string) => PAD.left + ((new Date(d).getTime() - t0) / tSpan) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - yMin) / ySpan) * innerH;

  // Build the line path. Skip non-finite vwaps gracefully.
  const linePoints = values
    .filter((v) => Number.isFinite(v.vwap))
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(v.date).toFixed(1)} ${y(v.vwap).toFixed(1)}`)
    .join(' ');

  // Closed path for the gradient area underneath the line.
  const areaPoints = `${linePoints} L ${x(values[values.length - 1]!.date).toFixed(1)} ${PAD.top + innerH} L ${x(values[0]!.date).toFixed(1)} ${PAD.top + innerH} Z`;

  // 4 horizontal grid lines + Y labels at 0%, 33%, 66%, 100% of span.
  const yTicks = [0, 0.33, 0.66, 1].map((f) => yMin + ySpan * f);

  // X ticks: 5 evenly-spaced dates across the window.
  const xTickIdx = [0, 0.25, 0.5, 0.75, 1].map((f) =>
    Math.min(values.length - 1, Math.round(f * (values.length - 1))),
  );

  // Methodology version markers: a dashed vertical line wherever the version
  // changes from one day to the next. Today this never fires (v1.0 only) but
  // is the visual that proves a future committee approval is in the data.
  const methodologyMarkers: Array<{ date: string; version: string }> = [];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1]!.methodology_version;
    const cur = values[i]!.methodology_version;
    if (prev && cur && prev !== cur) {
      methodologyMarkers.push({ date: values[i]!.date, version: cur });
    }
  }

  const stroke = positive ? '#4ade80' : '#f87171';
  const gradientId = `cti-area-${positive ? 'pos' : 'neg'}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      role="img"
      aria-label={`${watermark} — VWAP over ${values.length} days`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Plot frame */}
      <rect
        x={PAD.left}
        y={PAD.top}
        width={innerW}
        height={innerH}
        fill="#111114"
        stroke="#26262d"
        strokeWidth="1"
      />

      {/* Horizontal grid + Y labels */}
      {yTicks.map((v, i) => {
        const yy = y(v);
        return (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={yy}
              y2={yy}
              stroke="#26262d"
              strokeDasharray="2,3"
            />
            <text
              x={PAD.left - 8}
              y={yy + 3}
              textAnchor="end"
              fontSize="10"
              fontFamily="JetBrains Mono, ui-monospace, monospace"
              fill="#71717a"
            >
              ${v.toFixed(2)}
            </text>
          </g>
        );
      })}

      {/* Methodology change markers */}
      {methodologyMarkers.map((m, i) => (
        <g key={`marker-${i}`}>
          <line
            x1={x(m.date)}
            x2={x(m.date)}
            y1={PAD.top}
            y2={PAD.top + innerH}
            stroke="#fbbf24"
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity="0.7"
          />
          <text
            x={x(m.date) + 4}
            y={PAD.top + 12}
            fontSize="9"
            fontFamily="JetBrains Mono, ui-monospace, monospace"
            fill="#fbbf24"
          >
            → {m.version}
          </text>
        </g>
      ))}

      {/* Area + line */}
      <path d={areaPoints} fill={`url(#${gradientId})`} />
      <path d={linePoints} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />

      {/* X labels */}
      {xTickIdx.map((idx, i) => {
        const v = values[idx]!;
        const xx = x(v.date);
        return (
          <text
            key={i}
            x={xx}
            y={H - 14}
            textAnchor={i === 0 ? 'start' : i === xTickIdx.length - 1 ? 'end' : 'middle'}
            fontSize="10"
            fontFamily="JetBrains Mono, ui-monospace, monospace"
            fill="#71717a"
          >
            {formatTick(v.date)}
          </text>
        );
      })}

      {/* Watermark — bottom right of the plot area */}
      <text
        x={PAD.left + innerW - 8}
        y={PAD.top + innerH - 10}
        textAnchor="end"
        fontSize="10"
        fontFamily="JetBrains Mono, ui-monospace, monospace"
        fill="#52525b"
      >
        {watermark}
      </text>
    </svg>
  );
}

function formatTick(iso: string): string {
  // YYYY-MM-DD → MMM DD (compact mono)
  const d = new Date(iso);
  const month = d.toLocaleString('en', { month: 'short' });
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${month} ${day}`;
}
