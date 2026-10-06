import { ClosingCta, SiteFooter } from '@/components/marketing/closing';
import { Features } from '@/components/marketing/features';
import { Hero } from '@/components/marketing/hero';
import { Languages } from '@/components/marketing/languages';
import { Roles } from '@/components/marketing/roles';
import { Security } from '@/components/marketing/security';
import { SiteHeader } from '@/components/site-header';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <Roles />
        <Languages />
        <Security />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  );
}
