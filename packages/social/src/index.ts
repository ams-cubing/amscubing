export { extractFirstImageUrl } from "./competition-logo";
export { extractSpanishIntroFromInformation } from "./competition-information";

export {
  extractWcaCompetitionId,
  normalizeWcaCompetitionUrl,
  fetchWcaCompetition,
  type WcaCompetitionDetails,
} from "./wca-competition";
export { formatDateRangeEs, formatEventLabels } from "./format";
export {
  getMetaConfig,
  buildAnnouncementCaption,
  facebookPostUrl,
  publishToTorneoDeRubik,
  publishInstagramOnly,
  fetchInstagramPermalink,
  type MetaConfig,
  type PublishAnnouncementInput,
  type PublishAnnouncementResult,
  type BuildAnnouncementCaptionInput,
} from "./meta-publish";
export {
  publishCompetitionSocialAnnouncement,
  buildAnnouncementPreview,
  completeInstagramAnnouncement,
  resolveAnnouncementBodyText,
  type AnnounceSocialPublishInput,
  type AnnounceSocialPublishResult,
  type AnnouncementPreviewResult,
} from "./announce-and-publish";
