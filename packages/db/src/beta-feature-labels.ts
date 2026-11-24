export const BETA_FEATURES = {
  boards_tools: {
    label: "Herramientas nuevas de tableros",
    description:
      "Presupuesto, categorías/horario, detalles, staff y correos informativo/final en los tableros.",
  },
} as const;

export type BetaFeatureKey = keyof typeof BETA_FEATURES;

export const BOARDS_TOOLS_BETA_KEY = "boards_tools" satisfies BetaFeatureKey;

export function isBetaFeatureKey(value: string): value is BetaFeatureKey {
  return Object.prototype.hasOwnProperty.call(BETA_FEATURES, value);
}

export function betaFeatureLabel(key: BetaFeatureKey) {
  return BETA_FEATURES[key].label;
}

/** Shared copy when the boards tools beta is off for the current user. */
export const BOARDS_TOOLS_DENIED_MESSAGE =
  "Esta función beta no está activada para tu cuenta. Usa los adjuntos Excel/Drive de la tarjeta o pide acceso a un delegado.";
