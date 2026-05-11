'use client';

// Live UTC clock in the hero meta line. Renders the placeholder server-side
// to avoid layout shift, then ticks in client useEffect.

import { useEffect, useState } from 'react';

function formatUtc(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} UTC`;
}

export function Clock() {
  const [now, setNow] = useState<string>('—— UTC');

  useEffect(() => {
    setNow(formatUtc(new Date()));
    const id = setInterval(() => setNow(formatUtc(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return <span>{now}</span>;
}
