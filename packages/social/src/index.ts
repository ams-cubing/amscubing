export { extractFirstImageUrl } from "./competition-logo";
export { extractSpanishIntroFromInformation } from "./competition-information";

export {
  extractWcaCompetitionId,
  normalizeWcaCompetitionUrl,
  fetchWcaCompetition,
  plainTextFromWcaMarkup,
  type WcaCompetitionDetails,
} from "./wca-competition";
export {
  formatDateRangeEs,
  formatEventLabels,
  formatPlaceLine,
  formatCoverCityLine,
  formatCoverStateLabel,
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
  coverRowCounts,
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
  getTorneoDeRubikCoverStatus,
  coverInputsFingerprint,
  classifyCoverStatus,
  type RefreshCoverResult,
  type CoverStatus,
  type TorneoDeRubikCoverStatus,
} from "./refresh-cover";