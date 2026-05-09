// Tiny inline SVG sparkline. No external dep — keeps the table render fast.

export function Sparkline({
  values,
  width = 80,
  height = 22,
  positive = true,
}: {
  values: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}) {
  if (values.length < 2) {
    return <svg width={width} height={height} aria-hidden />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const stroke = positive ? '#4ade80' : '#f87171';
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
