export type CompetitionSocialStatus =
  | "pending_announce"
  | "fb_ig"
  | "fb_only"
  | "manual"
  | "missing";

export type ClassifyCompetitionSocialStatusInput = {
  statusPublic: string;
  facebookPostId: string | null | undefined;
  instagramMediaId: string | null | undefined;
  socialPublishedManually: boolean | null | undefined;
};

export function classifyCompetitionSocialStatus(
  input: ClassifyCompetitionSocialStatusInput,
): CompetitionSocialStatus {
  if (input.statusPublic !== "announced") {
    return "pending_announce";
  }
  if (input.facebookPostId && input.instagramMediaId) {
    return "fb_ig";
  }
  if (input.facebookPostId) {
    return "fb_only";
  }
  if (input.socialPublishedManually) {
    return "manual";
  }
  return "missing";
}

export function competitionSocialStatusLabel(
  status: CompetitionSocialStatus,
): string {
  switch (status) {
    case "pending_announce":
      return "Pendiente de anunciar";
    case "fb_ig":
      return "FB + IG";
    case "fb_only":
      return "Solo FB";
    case "manual":
      return "Manual";
    case "missing":
      return "Sin publicar";
  }
}

export function competitionSocialStatusDescription(
  status: CompetitionSocialStatus,
): string {
  switch (status) {
    case "pending_announce":
      return "Se publica en Torneo de Rubik al anunciar la competencia en el calendario.";
    case "fb_ig":
      return "Publicada en Facebook e Instagram.";
    case "fb_only":
      return "Publicada en Facebook. Falta Instagram (suele requerir imagen).";
    case "manual":
      return "Marcada como publicada manualmente (sin Meta).";
    case "missing":
      return "La competencia está anunciada pero aún no hay publicación en redes.";
  }
}

export function competitionSocialStatusClassName(
  status: CompetitionSocialStatus,
): string {
  switch (status) {
    case "pending_announce":
      return "bg-slate-100 text-slate-800";
    case "fb_ig":
      return "bg-emerald-100 text-emerald-900";
    case "fb_only":
      return "bg-amber-100 text-amber-900";
    case "manual":
      return "bg-sky-100 text-sky-900";
    case "missing":
      return "bg-rose-100 text-rose-900";
  }
}

export function competitionSocialCanRetry(
  status: CompetitionSocialStatus,
): boolean {
  return status === "missing";
}

export function competitionSocialCanCompleteInstagram(input: {
  facebookPostId: string | null | undefined;
  instagramMediaId: string | null | undefined;
}): boolean {
  return Boolean(input.facebookPostId) && !input.instagramMediaId;
}

export function competitionSocialCanMarkManual(
  status: CompetitionSocialStatus,
): boolean {
  return status === "missing";
}
