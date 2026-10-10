import { log } from "@workspace/server/log";

import {
  getMetaConfig,
  getMetaPageConfig,
  type MetaConfig,
} from "./meta-config";
import {
  GRAPH_BASE,
  graphDelete,
  graphPost,
  graphPostMultipart,
} from "./meta-graph";

export {
  getMetaConfig,
  getMetaPageConfig,
  type MetaConfig,
} from "./meta-config";
export {
  buildAnnouncementCaption,
  buildUpcomingCompetitionsCaption,
  type BuildAnnouncementCaptionInput,
  type UpcomingCompetitionsCaptionItem,
} from "./meta-captions";

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

export function facebookPostUrl(facebookPostId: string): string {
  return `https://www.facebook.com/${facebookPostId}`;
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
    log.error("meta.orphan_facebook_post_delete_failed", {
      postId,
      message: result.message,
    });
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
    log.error("meta.instagram_publish_failed", { error });
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
      message:
        "Se necesita un logo de la competencia para publicar en Instagram.",
    };
  }

  try {
    return await publishInstagramPhoto(meta.config, input.caption, imageUrl);
  } catch (error) {
    log.error("meta.instagram_only_publish_failed", { error });
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

/**
 * Upload the cover PNG once as a published photo (timeline post + caption),
 * then set that same photo as the Facebook Page cover without an auto feed story.
 * Requires pages_manage_metadata (in addition to posting scopes).
 */
export async function updateFacebookPageCover(
  imagePng: Buffer,
  caption: string,
): Promise<{ ok: true; photoId: string } | { ok: false; message: string }> {
  const meta = getMetaPageConfig();
  if (!meta.ok) {
    return { ok: false, message: meta.message };
  }

  const { config } = meta;
  const uploaded = await graphPostMultipart(
    `/${config.pageId}/photos`,
    {
      published: "true",
      caption,
      access_token: config.pageAccessToken,
    },
    {
      fieldName: "source",
      filename: "torneo-cover.png",
      buffer: imagePng,
      contentType: "image/png",
    },
  );

  if (!uploaded.ok) {
    return { ok: false, message: `Facebook cover upload: ${uploaded.message}` };
  }

  const photoId =
    typeof uploaded.data.id === "string" ? uploaded.data.id : null;
  if (!photoId) {
    return {
      ok: false,
      message: "Facebook: la API no devolvió un id de foto para la portada.",
    };
  }

  // Graph expects `cover` as the photo id (numeric string), not a JSON blob.
  // See Page Updating: cover = numeric string | integer.
  const cover = await graphPost(`/${config.pageId}`, {
    cover: photoId,
    offset_x: "0",
    offset_y: "0",
    no_feed_story: "true",
    access_token: config.pageAccessToken,
  });

  if (!cover.ok) {
    // Fallback endpoint used by some Graph versions / tokens.
    const alt = await graphPost(`/${config.pageId}/cover_photos`, {
      photo: photoId,
      offset_y: "0",
      no_feed_story: "true",
      access_token: config.pageAccessToken,
    });
    if (!alt.ok) {
      return {
        ok: false,
        message: `Facebook cover set: ${cover.message}; fallback: ${alt.message}`,
      };
    }
  }

  return { ok: true, photoId };
}
