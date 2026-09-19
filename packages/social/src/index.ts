export { extractFirstImageUrl } from "./competition-logo";
export { extractSpanishIntroFromInformation } from "./competition-information";

export {
  extractWcaCompetitionId,
  normalizeWcaCompetitionUrl,
  fetchWcaCompetition,
  type WcaCompetitionDetails,
} from "./wca-competition";
export {
  formatDateRangeEs,
  formatEventLabels,
  formatPlaceLine,
  formatCoverDateRange,
  formatCoverRegistrationRange,
} from "./format";
export {
  getMetaConfig,
  getMetaPageConfig,
  buildAnnouncementCaption,
  facebookPostUrl,
  publishToTorneoDeRubik,
  publishInstagramOnly,
  fetchInstagramPermalink,
  updateFacebookPageCover,
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
export {
  COVER_WIDTH,
  COVER_HEIGHT,
  COVER_MAX_SLOTS,
  selectCoverCompetitions,
  generateCoverPng,
  generateCoverPngFromInputs,
  prepareCoverSlots,
  hashCoverPng,
  type CoverSlotInput,
  type CoverSlot,
} from "./cover-image";
export {
  listCoverCompetitionInputs,
  generateTorneoDeRubikCoverPng,
  refreshTorneoDeRubikCover,
  refreshTorneoDeRubikCoverBestEffort,
  type RefreshCoverResult,
} from "./refresh-cover";
