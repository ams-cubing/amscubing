import { log } from "@workspace/server/log";

const GRAPH_API_VERSION = "v21.0";
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type GraphResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; message: string };

export async function graphPost(
  path: string,
  params: Record<string, string>,
): Promise<GraphResult> {
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
    log.error("meta.graph_post_failed", { path, error });
    return { ok: false, message: "Error de red al publicar en Meta." };
  }
}

export async function graphPostMultipart(
  path: string,
  fields: Record<string, string>,
  file: {
    fieldName: string;
    filename: string;
    buffer: Buffer;
    contentType: string;
  },
): Promise<GraphResult> {
  try {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }
    form.append(
      file.fieldName,
      new Blob([new Uint8Array(file.buffer)], { type: file.contentType }),
      file.filename,
    );

    const response = await fetch(`${GRAPH_BASE}${path}`, {
      method: "POST",
      body: form,
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
    log.error("meta.graph_multipart_failed", { path, error });
    return { ok: false, message: "Error de red al subir imagen a Meta." };
  }
}

export async function graphDelete(
  path: string,
  accessToken: string,
): Promise<GraphResult> {
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
    log.error("meta.graph_delete_failed", { path, error });
    return { ok: false, message: "Error de red al eliminar en Meta." };
  }
}
