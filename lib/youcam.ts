import sharp from "sharp";

const API_BASE = "https://yce-api-01.makeupar.com";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PROVIDER_REQUEST_TIMEOUT_MS = 15_000;
const FILE_REQUEST_TIMEOUT_MS = 8_000;
const IMAGE_UPLOAD_TIMEOUT_MS = 12_000;
const TASK_CREATION_TIMEOUT_MS = 12_000;
const TASK_POLL_TIMEOUT_MS = 8_000;
const RESULT_IMAGE_TIMEOUT_MS = 12_000;

type YouCamTimeoutCode =
  | "FILE_REQUEST_TIMEOUT"
  | "IMAGE_UPLOAD_TIMEOUT"
  | "TASK_CREATION_TIMEOUT"
  | "TASK_POLL_TIMEOUT"
  | "RESULT_IMAGE_TIMEOUT";

type TaskCreationOutcome = "not-created" | "rejected";

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
  readonly status: number;
  readonly code?: YouCamTimeoutCode;
  readonly taskCreationOutcome?: TaskCreationOutcome;

  constructor(
    message: string,
    status = 502,
    code?: YouCamTimeoutCode,
    taskCreationOutcome?: TaskCreationOutcome,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.taskCreationOutcome = taskCreationOutcome;
  }
}

export async function fetchWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
  timeoutCode?: YouCamTimeoutCode,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new YouCamError(timeoutMessage, 504, timeoutCode);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
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

async function providerFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = PROVIDER_REQUEST_TIMEOUT_MS,
  timeoutMessage = "The YouCam request timed out. Please try again.",
  timeoutCode?: YouCamTimeoutCode,
) {
  const key = apiKey();
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${key}`,
        ...init.headers,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as ProviderError | null;
    if (controller.signal.aborted) {
      throw new YouCamError(timeoutMessage, 504, timeoutCode);
    }
    if (!response.ok) {
      const message =
        body?.error_code === "CreditInsufficiency"
          ? "The YouCam API account is out of units. Check its API console."
          : body?.error || `The YouCam API returned an error (${response.status}).`;
      const taskCreationOutcome =
        timeoutCode === "TASK_CREATION_TIMEOUT" &&
        [400, 401, 429].includes(response.status)
          ? "rejected"
          : undefined;
      throw new YouCamError(message, response.status, undefined, taskCreationOutcome);
    }
    return body;
  } catch (error) {
    if (error instanceof YouCamError) throw error;
    if (controller.signal.aborted) {
      throw new YouCamError(timeoutMessage, 504, timeoutCode);
    }
    throw new YouCamError("Could not reach the YouCam API. Please try again.");
  } finally {
    clearTimeout(timeout);
  }
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
  const fileResponse = (await providerFetch(
    "/s2s/v2.0/file",
    {
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
    },
    FILE_REQUEST_TIMEOUT_MS,
    "The YouCam file request timed out. Please try again.",
    "FILE_REQUEST_TIMEOUT",
  )) as FileApiResponse | null;

  const fileInfo = fileResponse?.data?.files?.[0];
  const uploadRequest = fileInfo?.requests?.[0];
  if (!fileInfo?.file_id || !uploadRequest?.url || !uploadRequest.method) {
    throw new YouCamError("The YouCam upload API returned an incomplete response.");
  }
  const uploadUrl = uploadRequest.url;
  const uploadMethod = uploadRequest.method;

  try {
    const uploadResponse = await fetchWithTimeout(
      (signal) => fetch(uploadUrl, {
        method: uploadMethod,
        headers: uploadRequest.headers,
        body: new Uint8Array(image),
        signal,
      }),
      IMAGE_UPLOAD_TIMEOUT_MS,
      "Uploading an image to YouCam timed out. Its preview request status may be uncertain; do not retry with a new request key.",
      "IMAGE_UPLOAD_TIMEOUT",
    );
    if (!uploadResponse.ok) {
      throw new YouCamError(`The image upload failed (${uploadResponse.status}).`);
    }
  } catch (error) {
    if (error instanceof YouCamError) throw error;
    throw new YouCamError("The image upload failed. Please try again.");
  }
  return fileInfo.file_id;
}

export async function createHairstyleTask(
  source: File,
  reference: File | null,
  templateId: string | null,
) {
  let sourceId: string;
  let referenceId: string | null;
  try {
    sourceId = await uploadImage(source);
    referenceId = reference ? await uploadImage(reference) : null;
  } catch (error) {
    if (error instanceof YouCamError) {
      throw new YouCamError(
        error.message,
        error.status,
        error.code,
        "not-created",
      );
    }
    throw error;
  }

  const body: Record<string, string> = { src_file_id: sourceId };
  if (referenceId) body.ref_file_id = referenceId;
  else if (templateId) body.template_id = templateId;
  else throw new YouCamError("Choose a hairstyle or upload a reference photo.", 400);

  const result = (await providerFetch(
    "/s2s/v2.1/task/hair-transfer",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    TASK_CREATION_TIMEOUT_MS,
    "Uploading an image to YouCam timed out. The upload outcome is uncertain. Do not retry with a new request key.",
    "TASK_CREATION_TIMEOUT",
  )) as { data?: { task_id?: string } } | null;

  if (!result?.data?.task_id) {
    throw new YouCamError("The YouCam API did not return a task ID.");
  }
  return result.data.task_id;
}

export async function getTaskStatus(taskId: string) {
  const result = (await providerFetch(
    `/s2s/v2.1/task/hair-transfer/${encodeURIComponent(taskId)}`,
    {},
    TASK_POLL_TIMEOUT_MS,
    "Checking YouCam task status timed out. Please try again.",
    "TASK_POLL_TIMEOUT",
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
    response = await fetchWithTimeout(
      (signal) => fetch(resultUrl, { cache: "no-store", signal }),
      RESULT_IMAGE_TIMEOUT_MS,
      "Retrieving the preview image timed out. Please try again.",
      "RESULT_IMAGE_TIMEOUT",
    );
  } catch (error) {
    if (error instanceof YouCamError) throw error;
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
