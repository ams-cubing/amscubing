import {
  formatDateRangeEs,
  formatEventLabels,
  formatUpcomingListDateRangeEs,
} from "./format";
import { plainTextFromWcaMarkup } from "./wca-competition";

export type BuildAnnouncementCaptionInput = {
  name: string;
  city: string;
  stateName?: string | null;
  startDate: string;
  endDate: string;
  wcaUrl: string;
  customText: string;
  tags?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  venueDetails?: string | null;
  eventIds?: string[];
  competitorLimit?: number | null;
  capacityFallback?: number | null;
};

export type UpcomingCompetitionsCaptionItem = {
  name: string;
  city: string;
  stateName?: string | null;
  startDate: string;
  endDate: string;
  venueName?: string | null;
  venueAddress?: string | null;
  venueDetails?: string | null;
  eventIds?: string[];
  competitorLimit?: number | null;
  capacityFallback?: number | null;
};

const WCA_MX_COMPETITIONS_URL =
  "https://www.worldcubeassociation.org/competitions?region=MX";

export function buildAnnouncementCaption(
  input: BuildAnnouncementCaptionInput,
): string {
  const customText = input.customText.trim();
  const dateLabel = formatDateRangeEs(input.startDate, input.endDate);
  const venueLine =
    plainTextFromWcaMarkup(input.venueName) ||
    plainTextFromWcaMarkup(input.venueDetails) ||
    plainTextFromWcaMarkup(input.venueAddress) ||
    null;
  const cityLine = [input.city, input.stateName?.trim()]
    .filter(Boolean)
    .join(", ");
  const events = formatEventLabels(input.eventIds ?? []);
  const limit =
    input.competitorLimit && input.competitorLimit > 0
      ? input.competitorLimit
      : input.capacityFallback && input.capacityFallback > 0
        ? input.capacityFallback
        : null;
  const tags = input.tags?.trim() || null;

  const lines: string[] = [];
  if (customText) {
    lines.push(customText, ``);
  }
  lines.push(`¡BIENVENIDOS A ${input.name.toUpperCase()}!`);
  lines.push(`📅: ${dateLabel}`);
  if (venueLine) lines.push(`📍: ${venueLine}`);
  if (cityLine) lines.push(`🏙️: ${cityLine}`);
  if (events) lines.push(`🔻: ${events}`);
  if (limit) lines.push(`🎟️: ${limit} competidores`);
  if (tags) lines.push(`ℹ️: ${tags}`);
  lines.push(input.wcaUrl);

  return lines.join("\n");
}

/** Multi-competition caption for the Torneo de Rubik cover feed post. */
export function buildUpcomingCompetitionsCaption(
  competitions: UpcomingCompetitionsCaptionItem[],
): string {
  const lines: string[] = ["PRÓXIMAS COMPETENCIAS:"];

  for (const competition of competitions) {
    const name = competition.name.trim();
    if (!name) continue;

    const venueLine =
      plainTextFromWcaMarkup(competition.venueName) ||
      plainTextFromWcaMarkup(competition.venueDetails) ||
      plainTextFromWcaMarkup(competition.venueAddress) ||
      null;
    const cityLine = [competition.city.trim(), competition.stateName?.trim()]
      .filter(Boolean)
      .join(", ");
    const events = formatEventLabels(competition.eventIds ?? []);
    const limit =
      competition.competitorLimit && competition.competitorLimit > 0
        ? competition.competitorLimit
        : competition.capacityFallback && competition.capacityFallback > 0
          ? competition.capacityFallback
          : null;

    lines.push("");
    lines.push(name);
    lines.push(
      `📅: ${formatUpcomingListDateRangeEs(competition.startDate, competition.endDate)}`,
    );
    if (venueLine) lines.push(`📍: ${venueLine}`);
    if (cityLine) lines.push(`🏙️: ${cityLine}`);
    if (events) lines.push(`🔻: ${events}`);
    if (limit) lines.push(`🎟️: ${limit} competidores`);
  }

  lines.push("", "Toda la info:", WCA_MX_COMPETITIONS_URL);
  return lines.join("\n");
}
