'use client';

// Single-button Light/Dark toggle for the Aurum theme. Writes data-mode
// on <html> + persists in localStorage. The Plexus canvas observes the
// attribute and repaints. Dark Matter (the alternative palette from the
// design prototype) is intentionally not exposed — Carlos picked Aurum.

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cti.theme.mode';

export function ThemeToggle() {
  const [mode, setMode] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const stored = (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as
      | 'light'
      | 'dark'
      | null;
    const initial: 'light' | 'dark' =
      stored ?? (document.documentElement.getAttribute('data-mode') === 'dark' ? 'dark' : 'light');
    document.documentElement.setAttribute('data-mode', initial);
    setMode(initial);
  }, []);

  if (mode === null) {
    // Server-rendered placeholder: empty square, matches button footprint.
    return <button className="theme-toggle" aria-label="Toggle theme" type="button" />;
  }

  const next = mode === 'light' ? 'dark' : 'light';

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => {
        document.documentElement.setAttribute('data-mode', next);
        localStorage.setItem(STORAGE_KEY, next);
        setMode(next);
      }}
    >
      {mode === 'light' ? (
        // moon
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // sun
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
    </button>
  );
}
