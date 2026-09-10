import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { QuienesSomos } from "@/components/quienes-somos";
import { SiteCta } from "@/components/site-cta";
import { SiteFooter } from "@/components/site-footer";
import { getPublicDelegates } from "@/lib/delegates";

export const metadata: Metadata = {
  title: "Nosotros | Asociación Mexicana de Speedcubing",
  description:
    "Conoce a la Asociación Mexicana de Speedcubing, sus objetivos, planes y delegados WCA en México.",
};

export default async function NosotrosPage() {
  const delegates = await getPublicDelegates();

  return (
    <main>
      <SiteNav active="Nosotros" />
      <QuienesSomos delegates={delegates} />
      <SiteCta />
      <SiteFooter />
    </main>
  );
}
