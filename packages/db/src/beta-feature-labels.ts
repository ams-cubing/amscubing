type BetaFeatureDef = { label: string; description: string };

/** Per-user beta features managed at /admin/beta. Board tools use board.boards_tools_beta. */
export const BETA_FEATURES = {
  // Future per-user betas go here.
} as const satisfies Record<string, BetaFeatureDef>;

export type BetaFeatureKey = keyof typeof BETA_FEATURES;

export function isBetaFeatureKey(value: string): value is BetaFeatureKey {
  return Object.prototype.hasOwnProperty.call(BETA_FEATURES, value);
}

export function betaFeatureLabel(key: BetaFeatureKey) {
  return (BETA_FEATURES as Record<string, BetaFeatureDef>)[key]?.label ?? key;
}

/** Shared copy when a board does not have the tools pack enabled. */
export const BOARDS_TOOLS_DENIED_MESSAGE =
  "Esta competencia no tiene las herramientas nuevas del tablero activadas. Usa los adjuntos Excel/Drive de la tarjeta o pide a un delegado que las active al crear o asignar el tablero.";
