// Index methodology functions — pure, deterministic, testable.
// Each function takes (snapshots, params) and returns a number plus diagnostics.

export interface MethodologyInput {
  pricePerHour: number;
  numGpus: number;
  capturedAt: Date;
  providerReliability: number;
}

export interface MethodologyResult {
  value: number;
  numObservations: number;
  numProviders?: number;
}

const median = (xs: number[]): number => {
  if (xs.length === 0) return NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
};

const mad = (xs: number[]): number => {
  const m = median(xs);
  return median(xs.map((x) => Math.abs(x - m)));
};

export const methodologies = {
  simple_vwap(rows: MethodologyInput[]): MethodologyResult {
    const sumW = rows.reduce((a, r) => a + r.numGpus, 0);
    const sumPV = rows.reduce((a, r) => a + r.pricePerHour * r.numGpus, 0);
    return { value: sumW > 0 ? sumPV / sumW : NaN, numObservations: rows.length };
  },

  filtered_vwap(rows: MethodologyInput[]): MethodologyResult {
    if (rows.length === 0) return { value: NaN, numObservations: 0 };
    const prices = rows.map((r) => r.pricePerHour);
    const m = median(prices);
    const d = mad(prices) || 1e-9;
    const kept = rows.filter((r) => Math.abs(r.pricePerHour - m) <= 3 * d);
    return methodologies.simple_vwap(kept);
  },

  trimmed_mean_10(rows: MethodologyInput[]): MethodologyResult {
    if (rows.length < 5) return methodologies.simple_vwap(rows);
    const sorted = [...rows].sort((a, b) => a.pricePerHour - b.pricePerHour);
    const cut = Math.floor(sorted.length * 0.1);
    const kept = sorted.slice(cut, sorted.length - cut);
    const sum = kept.reduce((a, r) => a + r.pricePerHour, 0);
    return { value: sum / kept.length, numObservations: kept.length };
  },

  median_weighted(rows: MethodologyInput[]): MethodologyResult {
    // Weighted by reliability_score: providers with higher reliability count more.
    if (rows.length === 0) return { value: NaN, numObservations: 0 };
    const expanded = rows.flatMap((r) => {
      const repeats = Math.max(1, Math.round(r.providerReliability * 10));
      return Array<number>(repeats).fill(r.pricePerHour);
    });
    return { value: median(expanded), numObservations: rows.length };
  },

  time_decay_vwap(rows: MethodologyInput[], params?: { halfLifeHours?: number }): MethodologyResult {
    const half = params?.halfLifeHours ?? 6;
    const lambda = Math.log(2) / half;
    const now = Date.now();
    let sumW = 0;
    let sumPV = 0;
    for (const r of rows) {
      const ageHours = Math.max(0, (now - r.capturedAt.getTime()) / 3.6e6);
      const w = r.numGpus * Math.exp(-lambda * ageHours);
      sumW += w;
      sumPV += r.pricePerHour * w;
    }
    return { value: sumW > 0 ? sumPV / sumW : NaN, numObservations: rows.length };
  },
} as const;

export type MethodologyName = keyof typeof methodologies;

export const allMethodologyNames: MethodologyName[] = [
  'simple_vwap',
  'filtered_vwap',
  'trimmed_mean_10',
  'median_weighted',
  'time_decay_vwap',
];

export function compositeScore(opts: {
  consistency: number;
  volatility: number;
  coverage: number;
}): number {
  return 0.5 * opts.consistency + 0.3 * (1 - opts.volatility) + 0.2 * opts.coverage;
}
