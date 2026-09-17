const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type MetaConfig = {
  pageId: string;
  pageAccessToken: string;
  igUserId: string;
};

export type PublishAnnouncementInput = {
  caption: string;
  /** WCA competition page URL (used for FB link posts when there is no image). */
  linkUrl: string;
  /** Competition logo URL when available. */
  imageUrl: string | null;
};

export type PublishAnnouncementResult =
  | {
      ok: true;
      facebookPostId: string;
      /** Null when there was no image (IG photo publish skipped). */
      instagramMediaId: string | null;
    }
  | { ok: false; message: string };

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

export function buildAnnouncementCaption(input: {
  name: string;
  city: string;
  startDate: string;
  endDate: string;
  wcaUrl: string;
}): string {
  const dateLabel =
    input.startDate === input.endDate
      ? formatDateEs(input.startDate)
      : `${formatDateEs(input.startDate)} – ${formatDateEs(input.endDate)}`;

  return [
    `¡Nueva competencia anunciada!`,
    ``,
    input.name,
    `${input.city} · ${dateLabel}`,
    ``,
    `Más información e inscripción:`,
    input.wcaUrl,
    ``,
    `#TorneoDeRubik #WCA #Speedcubing`,
  ].join("\n");
}

export function facebookPostUrl(facebookPostId: string): string {
  return `https://www.facebook.com/${facebookPostId}`;
}

function formatDateEs(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

async function graphPost(
  path: string,
  params: Record<string, string>,
): Promise<
  { ok: true; data: Record<string, unknown> } | { ok: false; message: string }
> {
  try {
    const response = await fetch(`${GRAPH_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });

    const json = (await response.json()) as {
      error?: { message?: string };
      id?: string;
      post_id?: string;
    };

    if (!response.ok || json.error) {
      return {
        ok: false,
        message: json.error?.message ?? `Meta API error (${response.status})`,
      };
    }

    return { ok: true, data: json as Record<string, unknown> };
  } catch (error) {
    console.error("Meta Graph POST failed:", error);
    return { ok: false, message: "Error de red al publicar en Meta." };
  }
}

async function graphDelete(
  path: string,
  accessToken: string,
): Promise<
  { ok: true; data: Record<string, unknown> } | { ok: false; message: string }
> {
  try {
    const url = new URL(`${GRAPH_BASE}${path}`);
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url.toString(), { method: "DELETE" });
    const json = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      success?: boolean;
    };

    if (!response.ok || json.error) {
      return {
        ok: false,
        message: json.error?.message ?? `Meta API error (${response.status})`,
      };
    }

    return { ok: true, data: json as Record<string, unknown> };
  } catch (error) {
    console.error("Meta Graph DELETE failed:", error);
    return { ok: false, message: "Error de red al eliminar en Meta." };
  }
}

async function publishFacebookPhoto(
  config: MetaConfig,
  caption: string,
  imageUrl: string,
): Promise<{ ok: true; postId: string } | { ok: false; message: string }> {
  const result = await graphPost(`/${config.pageId}/photos`, {
    url: imageUrl,
    caption,
    access_token: config.pageAccessToken,
  });

  if (!result.ok) {
    return { ok: false, message: `Facebook: ${result.message}` };
  }

  const postId =
    (typeof result.data.post_id === "string" && result.data.post_id) ||
    (typeof result.data.id === "string" && result.data.id) ||
    null;

  if (!postId) {
    return {
      ok: false,
      message: "Facebook: la API no devolvió un id de publicación.",
    };
  }

  return { ok: true, postId };
}

async function publishFacebookLink(
  config: MetaConfig,
  caption: string,
  linkUrl: string,
): Promise<{ ok: true; postId: string } | { ok: false; message: string }> {
  const result = await graphPost(`/${config.pageId}/feed`, {
    message: caption,
    link: linkUrl,
    access_token: config.pageAccessToken,
  });

  if (!result.ok) {
    return { ok: false, message: `Facebook: ${result.message}` };
  }

  const postId = typeof result.data.id === "string" ? result.data.id : null;

  if (!postId) {
    return {
      ok: false,
      message: "Facebook: la API no devolvió un id de publicación.",
    };
  }

  return { ok: true, postId };
}

async function deleteFacebookPost(
  config: MetaConfig,
  postId: string,
): Promise<void> {
  const result = await graphDelete(`/${postId}`, config.pageAccessToken);
  if (!result.ok) {
    console.error(
      "Failed to delete orphan Facebook post:",
      postId,
      result.message,
    );
  }
}

async function publishInstagramPhoto(
  config: MetaConfig,
  caption: string,
  imageUrl: string,
): Promise<{ ok: true; mediaId: string } | { ok: false; message: string }> {
  const container = await graphPost(`/${config.igUserId}/media`, {
    image_url: imageUrl,
    caption,
    access_token: config.pageAccessToken,
  });

  if (!container.ok) {
    return { ok: false, message: `Instagram: ${container.message}` };
  }

  const creationId =
    typeof container.data.id === "string" ? container.data.id : null;
  if (!creationId) {
    return {
      ok: false,
      message: "Instagram: no se obtuvo el id del contenedor de media.",
    };
  }

  await waitForIgContainer(config, creationId);

  const published = await graphPost(`/${config.igUserId}/media_publish`, {
    creation_id: creationId,
    access_token: config.pageAccessToken,
  });

  if (!published.ok) {
    return { ok: false, message: `Instagram: ${published.message}` };
  }

  const mediaId =
    typeof published.data.id === "string" ? published.data.id : null;
  if (!mediaId) {
    return {
      ok: false,
      message: "Instagram: la API no devolvió un id de media.",
    };
  }

  return { ok: true, mediaId };
}

async function waitForIgContainer(
  config: MetaConfig,
  creationId: string,
  attempts = 8,
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    const url = new URL(`${GRAPH_BASE}/${creationId}`);
    url.searchParams.set("fields", "status_code");
    url.searchParams.set("access_token", config.pageAccessToken);

    try {
      const response = await fetch(url.toString());
      const json = (await response.json()) as {
        status_code?: string;
        error?: { message?: string };
      };
      if (json.status_code === "FINISHED") return;
      if (json.status_code === "ERROR") {
        throw new Error(json.error?.message ?? "Contenedor IG en error");
      }
    } catch (error) {
      if (i === attempts - 1) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

/**
 * Publishes to Torneo de Rubik Facebook (and Instagram when an image exists).
 * Without an image: FB link post only (IG photo API requires an image).
 * If Instagram fails after Facebook succeeds, attempts to delete the FB post.
 */
export async function publishToTorneoDeRubik(
  input: PublishAnnouncementInput,
): Promise<PublishAnnouncementResult> {
  const meta = getMetaConfig();
  if (!meta.ok) {
    return { ok: false, message: meta.message };
  }

  const { config } = meta;
  const imageUrl = input.imageUrl?.trim() || null;

  const facebook = imageUrl
    ? await publishFacebookPhoto(config, input.caption, imageUrl)
    : await publishFacebookLink(config, input.caption, input.linkUrl);

  if (!facebook.ok) {
    return { ok: false, message: facebook.message };
  }

  if (!imageUrl) {
    return {
      ok: true,
      facebookPostId: facebook.postId,
      instagramMediaId: null,
    };
  }

  try {
    const instagram = await publishInstagramPhoto(
      config,
      input.caption,
      imageUrl,
    );
    if (!instagram.ok) {
      await deleteFacebookPost(config, facebook.postId);
      return { ok: false, message: instagram.message };
    }

    return {
      ok: true,
      facebookPostId: facebook.postId,
      instagramMediaId: instagram.mediaId,
    };
  } catch (error) {
    await deleteFacebookPost(config, facebook.postId);
    console.error("Instagram publish failed:", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Instagram: ${error.message}`
          : "Instagram: error al publicar.",
    };
  }
}

/** Publish Instagram only (e.g. complete a prior FB-only announce when a logo appears). */
export async function publishInstagramOnly(input: {
  caption: string;
  imageUrl: string;
}): Promise<{ ok: true; mediaId: string } | { ok: false; message: string }> {
  const meta = getMetaConfig();
  if (!meta.ok) {
    return { ok: false, message: meta.message };
  }

  const imageUrl = input.imageUrl.trim();
  if (!imageUrl) {
    return {
      ok: false,
      message: "Se necesita un logo de la competencia para publicar en Instagram.",
    };
  }

  try {
    return await publishInstagramPhoto(meta.config, input.caption, imageUrl);
  } catch (error) {
    console.error("Instagram-only publish failed:", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Instagram: ${error.message}`
          : "Instagram: error al publicar.",
    };
  }
}

/** Resolve a public Instagram permalink for a media id when Meta tokens are set. */
export async function fetchInstagramPermalink(
  instagramMediaId: string,
): Promise<string | null> {
  const token = process.env.META_PAGE_ACCESS_TOKEN?.trim();
  if (!token || !instagramMediaId.trim()) return null;

  try {
    const url = new URL(`${GRAPH_BASE}/${instagramMediaId.trim()}`);
    url.searchParams.set("fields", "permalink");
    url.searchParams.set("access_token", token);

    const response = await fetch(url.toString(), { cache: "no-store" });
    const json = (await response.json()) as {
      permalink?: string;
      error?: { message?: string };
    };
    if (!response.ok || json.error || !json.permalink) {
      return null;
    }
    return json.permalink;
  } catch {
    return null;
  }
}
