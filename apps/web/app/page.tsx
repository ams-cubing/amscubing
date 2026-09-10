import { SiteNav } from "@/components/site-nav";
import { Hero } from "@/components/hero";
import { ProximasCompetencias } from "@/components/proximas-competencias";
import { RankingNacional } from "@/components/ranking-nacional";
import { HomeSobreNosotros } from "@/components/home-sobre-nosotros";
import { Comunidad } from "@/components/comunidad";
import { SiteCta } from "@/components/site-cta";
import { SiteFooter } from "@/components/site-footer";
import {
  getCompetitionSpotlights,
  getPublicCompetitions,
} from "@/lib/competitions";
import { getNationalRankings } from "@/lib/rankings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [competitions, rankings] = await Promise.all([
    getPublicCompetitions(),
    getNationalRankings(),
  ]);
  const spotlights = getCompetitionSpotlights(competitions);

  return (
    <main>
      <SiteNav />
      <Hero spotlights={spotlights} />
      <ProximasCompetencias competitions={competitions} />
      <RankingNacional rankings={rankings} />
      <HomeSobreNosotros />
      <Comunidad />
      <SiteCta />
      <SiteFooter />
    </main>
  );
}
