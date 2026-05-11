// Landing — composed from the design handoff (Claude Design, 2026-05-11).
// Page strategy: ISR every 30s to match /markets. The only data-bound
// section here is <Methodology/> (real version history); everything else
// is presentational, so the cache is cheap.

import { Plexus } from '@/components/landing/plexus';
import { LandingNav } from '@/components/landing/nav';
import { Hero } from '@/components/landing/hero';
import { Differentiators } from '@/components/landing/differentiators';
import { MarketsPreview } from '@/components/landing/markets-preview';
import { Methodology } from '@/components/landing/methodology';
import { Pricing } from '@/components/landing/pricing';
import { LandingFooter } from '@/components/landing/footer';

export const revalidate = 30;

export default function Home() {
  return (
    <>
      <Plexus />
      <div className="wrap">
        <LandingNav />
        <Hero />
        <div className="crosshair" />
        <Differentiators />
        <MarketsPreview />
        <Methodology />
        <Pricing />
        <LandingFooter />
      </div>
    </>
  );
}
