import { ClosingCta, SiteFooter } from '@/components/marketing/closing';
import { Features } from '@/components/marketing/features';
import { Hero } from '@/components/marketing/hero';
import { DayStory } from '@/components/marketing/day-story';
import { Languages } from '@/components/marketing/languages';
import { Pricing } from '@/components/marketing/pricing';
import { Roles } from '@/components/marketing/roles';
import { Security } from '@/components/marketing/security';
import { DemoStrip } from '@/components/marketing/demo-strip';
import { SiteHeader } from '@/components/site-header';
import { serverEnv } from '@/env.server';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <DayStory />
        <Features />
        <Roles />
        <Languages />
        <Security />
        <Pricing />
        {serverEnv.DEMO_PASSWORD ? <DemoStrip /> : null}
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  );
}
