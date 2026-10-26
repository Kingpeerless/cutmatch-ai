import sharp from "sharp";

const API_BASE = "https://yce-api-01.makeupar.com";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ProviderError = {
  error?: string;
  error_code?: string;
};

type FileApiResponse = {
  data?: {
    files?: Array<{
      file_id?: string;
      requests?: Array<{
        url?: string;
        method?: string;
        headers?: Record<string, string>;
      }>;
    }>;
  };
};

export type HairstyleTemplate = {
  id: string;
  thumb: string;
  title: string;
  category_name: string;
  keep_users_color?: boolean;
};

export class YouCamError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

function apiKey() {
  const key = process.env.YOUCAM_API_KEY?.trim();
  if (!key) {
    throw new YouCamError(
      "The YouCam API key is not configured. Add YOUCAM_API_KEY to your server environment.",
      503,
    );
  }
  return key;
}

async function providerFetch(path: string, init: RequestInit = {}) {
  const key = apiKey();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${key}`,
        ...init.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new YouCamError("Could not reach the YouCam API. Please try again.");
  }

  const body = (await response.json().catch(() => null)) as ProviderError | null;
  if (!response.ok) {
    const message =
      body?.error_code === "CreditInsufficiency"
        ? "The YouCam API account is out of units. Check its API console."
        : body?.error || `The YouCam API returned an error (${response.status}).`;
    throw new YouCamError(message, response.status);
  }
  return body;
}

export async function listTemplates(startingToken?: string) {
  const params = new URLSearchParams({ page_size: "20" });
  if (startingToken) params.set("starting_token", startingToken);
  const response = (await providerFetch(
    `/s2s/v2.1/task/template/hair-transfer?${params}`,
  )) as {
    data?: { templates?: HairstyleTemplate[]; next_token?: string };
  } | null;

  return {
    templates: response?.data?.templates ?? [],
    nextToken: response?.data?.next_token ?? null,
  };
}

async function uploadImage(file: File) {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new YouCamError("Choose a JPEG, PNG, or WebP image.", 400);
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new YouCamError("Each image must be smaller than 10 MB.", 400);
  }

  let image: Buffer;
  try {
    image = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch {
    throw new YouCamError("That file is not a readable image. Try another photo.", 400);
  }

  const fileName = `${crypto.randomUUID()}.jpg`;
  const fileResponse = (await providerFetch("/s2s/v2.0/file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: [
        {
          content_type: "image/jpeg",
          file_name: fileName,
          file_size: image.byteLength,
        },
      ],
    }),
  })) as FileApiResponse | null;

  const fileInfo = fileResponse?.data?.files?.[0];
  const uploadRequest = fileInfo?.requests?.[0];
  if (!fileInfo?.file_id || !uploadRequest?.url || !uploadRequest.method) {
    throw new YouCamError("The YouCam upload API returned an incomplete response.");
  }

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(uploadRequest.url, {
      method: uploadRequest.method,
      headers: uploadRequest.headers,
      body: new Uint8Array(image),
    });
  } catch {
    throw new YouCamError("The image upload failed. Please try again.");
  }
  if (!uploadResponse.ok) {
    throw new YouCamError(`The image upload failed (${uploadResponse.status}).`);
  }
  return fileInfo.file_id;
}

export async function createHairstyleTask(
  source: File,
  reference: File | null,
  templateId: string | null,
) {
  const sourceId = await uploadImage(source);
  const referenceId = reference ? await uploadImage(reference) : null;

  const body: Record<string, string> = { src_file_id: sourceId };
  if (referenceId) body.ref_file_id = referenceId;
  else if (templateId) body.template_id = templateId;
  else throw new YouCamError("Choose a hairstyle or upload a reference photo.", 400);

  const result = (await providerFetch("/s2s/v2.1/task/hair-transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })) as { data?: { task_id?: string } } | null;

  if (!result?.data?.task_id) {
    throw new YouCamError("The YouCam API did not return a task ID.");
  }
  return result.data.task_id;
}

export async function getTaskStatus(taskId: string) {
  const result = (await providerFetch(
    `/s2s/v2.1/task/hair-transfer/${encodeURIComponent(taskId)}`,
  )) as {
    data?: {
      task_status?: "running" | "success" | "error";
      error?: string | null;
      error_message?: string;
      results?: { url?: string };
    };
  } | null;

  return result?.data;
}

export async function downloadTaskResult(taskId: string) {
  const task = await getTaskStatus(taskId);
  if (task?.task_status !== "success" || !task.results?.url) {
    throw new YouCamError("This preview is not ready to download.", 409);
  }

  let resultUrl: URL;
  try {
    resultUrl = new URL(task.results.url);
  } catch {
    throw new YouCamError("The YouCam API returned an invalid result URL.");
  }
  if (resultUrl.protocol !== "https:") {
    throw new YouCamError("The YouCam API returned an insecure result URL.");
  }

  let response: Response;
  try {
    response = await fetch(resultUrl, { cache: "no-store" });
  } catch {
    throw new YouCamError("Could not retrieve the preview image. Please try again.");
  }
  if (!response.ok || !response.body) {
    throw new YouCamError("Could not retrieve the preview image. Please try again.");
  }
  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    throw new YouCamError("The preview result was not a supported image.");
  }
  return { body: response.body, contentType };
}
