import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compute Index Terminal',
  description: 'Real-time GPU-hour prices and the reference index for compute futures.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap"
        />
      </head>
      <body className="bg-bg-base text-ink-primary antialiased">{children}</body>
    </html>
  );
}
