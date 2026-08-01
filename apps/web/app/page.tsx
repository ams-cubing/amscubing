import { SiteNav } from "@/components/site-nav";
import { Hero } from "@/components/hero";
import { QuienesSomos } from "@/components/quienes-somos";
import { ProximasCompetencias } from "@/components/proximas-competencias";
import { Delegados } from "@/components/delegados";
import { BlogTeaser } from "@/components/blog-teaser";
import { Contacto } from "@/components/contacto";
import { SiteFooter } from "@/components/site-footer";

export default function HomePage() {
  return (
    <main>
      <SiteNav />
      <Hero />
      <QuienesSomos />
      <ProximasCompetencias />
      <Delegados />
      <BlogTeaser />
      <Contacto />
      <SiteFooter />
    </main>
  );
}
