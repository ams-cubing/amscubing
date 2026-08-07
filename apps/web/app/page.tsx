import { SiteNav } from "@/components/site-nav";
import { Hero } from "@/components/hero";
import { QuienesSomos } from "@/components/quienes-somos";
import { ProximasCompetencias } from "@/components/proximas-competencias";
import { Delegados } from "@/components/delegados";
import { BlogTeaser } from "@/components/blog-teaser";
import { Contacto } from "@/components/contacto";
import { SiteFooter } from "@/components/site-footer";
import { getPublicDelegates } from "@/lib/delegates";

export default async function HomePage() {
  const delegates = await getPublicDelegates();

  return (
    <main>
      <SiteNav />
      <Hero />
      <QuienesSomos />
      <ProximasCompetencias />
      <Delegados delegates={delegates} />
      <BlogTeaser />
      <Contacto />
      <SiteFooter />
    </main>
  );
}
