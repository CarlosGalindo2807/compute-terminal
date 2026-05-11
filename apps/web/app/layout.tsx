import './globals.css';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PostHogProvider } from '@/components/posthog-provider';

export const metadata: Metadata = {
  title: 'Compute Index Terminal — the reference price for compute',
  description:
    'The procurement and observability terminal for teams that buy AI compute. Real-time GPU prices, independently governed reference index, methodology v1.0.',
};

// Boot script: applies persisted Aurum theme mode before paint so the
// landing doesn't flash the wrong palette. Server renders data-mode="light"
// (Carlos's choice during design iteration); client immediately reads
// localStorage and updates if the user toggled in a prior visit.
const themeBoot = `
(function(){
  try {
    var m = localStorage.getItem('cti.theme.mode');
    if (m === 'dark' || m === 'light') {
      document.documentElement.setAttribute('data-mode', m);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="aurum" data-mode="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500;600&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="bg-bg-base text-ink-primary antialiased">
        <Suspense fallback={null}>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}
