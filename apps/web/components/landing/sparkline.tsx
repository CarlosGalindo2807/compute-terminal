// SVG sparkline. Accepts either a deterministic seed (for decorative texture)
// or a real series of values (for live-data sparklines). When `values` is
// passed it wins; otherwise an LCG seeded with `seed` produces a stable path.
// Server-rendered — every output is deterministic so hydration matches.

type Variant = 'stroke' | 'area';

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 31;
    return s / 2 ** 31;
  };
}

interface Props {
  seed?: number;
  /** Real data series. When provided, overrides the seeded LCG. Any non-finite
   *  entries are dropped before rendering; an empty effective series falls
   *  back to seeded output. */
  values?: readonly number[];
  width?: number;
  height?: number;
  points?: number;
  variant?: Variant;
  className?: string;
  ariaLabel?: string;
}

function seriesFromSeed(seed: number, points: number): number[] {
  const rng = lcg(seed * 37 + 11);
  let v = 50 + rng() * 10;
  const pts: number[] = [];
  for (let i = 0; i < points; i++) {
    v += (rng() - 0.5) * 8;
    pts.push(v);
  }
  return pts;
}

export function Sparkline({
  seed = 1,
  values,
  width = 80,
  height = 16,
  points = 24,
  variant = 'stroke',
  className,
  ariaLabel = 'sparkline',
}: Props) {
  const clean = (values ?? []).filter((n) => Number.isFinite(n));
  const pts = clean.length >= 2 ? clean : seriesFromSeed(seed, points);
  const n = pts.length;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const d = pts
    .map(
      (p, i) =>
        `${i ? 'L' : 'M'}${((i / (n - 1)) * width).toFixed(1)},${(height - ((p - min) / range) * height).toFixed(1)}`,
    )
    .join(' ');
  const last = pts[n - 1]!;
  const lastY = (height - ((last - min) / range) * height).toFixed(1);

  if (variant === 'area') {
    return (
      <svg
        className={className}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-label={ariaLabel}
      >
        <path d={d} stroke="var(--accent)" fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d={`${d} L${width},${height} L0,${height} Z`} fill="var(--accent)" opacity="0.08" />
      </svg>
    );
  }

  return (
    <svg
      className={className ?? 'spark'}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={ariaLabel}
    >
      <path d={d} stroke="currentColor" fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.7" />
      <circle cx={width} cy={lastY} r="1.5" fill="var(--accent)" />
    </svg>
  );
}
