export type MetaConfig = {
  pageId: string;
  pageAccessToken: string;
  igUserId: string;
};

export function getMetaConfig():
  | { ok: true; config: MetaConfig }
  | { ok: false; message: string } {
  const pageId = process.env.META_PAGE_ID?.trim();
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN?.trim();
  const igUserId = process.env.META_IG_USER_ID?.trim();

  if (!pageId || !pageAccessToken || !igUserId) {
    return {
      ok: false,
      message:
        "Falta la configuración de Meta (META_PAGE_ID, META_PAGE_ACCESS_TOKEN, META_IG_USER_ID). No se puede publicar en redes.",
    };
  }

  return {
    ok: true,
    config: { pageId, pageAccessToken, igUserId },
  };
}

/** Page token only — enough for cover photo updates (IG id not required). */
export function getMetaPageConfig():
  | { ok: true; config: Pick<MetaConfig, "pageId" | "pageAccessToken"> }
  | { ok: false; message: string } {
  const pageId = process.env.META_PAGE_ID?.trim();
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN?.trim();

  if (!pageId || !pageAccessToken) {
    return {
      ok: false,
      message:
        "Falta la configuración de Meta (META_PAGE_ID, META_PAGE_ACCESS_TOKEN). No se puede actualizar la portada.",
    };
  }

  return {
    ok: true,
    config: { pageId, pageAccessToken },
  };
}
