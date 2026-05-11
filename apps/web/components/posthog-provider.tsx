'use client';

// PostHog browser client. Wires page views, click events, and identified
// session telemetry. No-ops cleanly when NEXT_PUBLIC_POSTHOG_KEY is not
// set, so deploys before the Marketplace integration is installed are
// safe. Once the env var lands, the next visit starts producing events.
//
// What we capture by default:
//   - autocapture on (clicks, form submits, page leaves)
//   - $pageview / $pageleave (manual; Next App Router doesn't fire these
//     automatically because route transitions are client-side)
//   - session recording is OFF (privacy + opt-in later)
//   - PII redaction relies on the default mask + person_profiles=identified_only
//     so anonymous visitors don't get profiles created.

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || posthog.__loaded) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // manual, see effect below
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: true,
      loaded: () => {
        if (process.env.NODE_ENV === 'development') {
          console.info('[posthog] loaded; key=' + key.slice(0, 8) + '…');
        }
      },
    });
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !posthog.__loaded) return;
    const qs = search?.toString();
    posthog.capture('$pageview', { $current_url: pathname + (qs ? `?${qs}` : '') });
  }, [pathname, search]);

  return <>{children}</>;
}
