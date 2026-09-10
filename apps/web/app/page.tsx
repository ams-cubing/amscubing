import { SiteNav } from "@/components/site-nav";
import { Hero } from "@/components/hero";
import { ProximasCompetencias } from "@/components/proximas-competencias";
import { RankingNacional } from "@/components/ranking-nacional";
import { HomeSobreNosotros } from "@/components/home-sobre-nosotros";
import { Comunidad } from "@/components/comunidad";
import { SiteCta } from "@/components/site-cta";
import { SiteFooter } from "@/components/site-footer";
import {
  getPublicCompetitionSpotlights,
  getPublicCompetitions,
} from "@/lib/competitions";
import { getCommunityStats } from "@/lib/community-stats";
import { getNationalRankings } from "@/lib/rankings";

export default async function HomePage() {
  const [competitions, rankings, spotlights, stats] = await Promise.all([
    getPublicCompetitions(),
    getNationalRankings(),
    getPublicCompetitionSpotlights(),
    getCommunityStats(),
  ]);

  return (
    <main>
      <SiteNav />
      <Hero spotlights={spotlights} stats={stats} />
      <ProximasCompetencias competitions={competitions} />
      <RankingNacional rankings={rankings} />
      <HomeSobreNosotros />
      <Comunidad />
      <SiteCta />
      <SiteFooter />
    </main>
  );
}
