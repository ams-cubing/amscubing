import { SiteNav } from "@/components/site-nav";
import { Hero } from "@/components/hero";
import { UpcomingCompetitions } from "@/components/upcoming-competitions";
import { NationalRanking } from "@/components/national-ranking";
import { HomeAbout } from "@/components/home-about";
import { Community } from "@/components/community";
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
      <UpcomingCompetitions competitions={competitions} />
      <NationalRanking rankings={rankings} />
      <HomeAbout />
      <Community />
      <SiteCta />
      <SiteFooter />
    </main>
  );
}
