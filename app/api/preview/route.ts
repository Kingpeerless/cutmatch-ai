import { NextRequest, NextResponse } from "next/server";
import { createHairstyleTask, YouCamError } from "@/lib/youcam";
import {
  createPreviewFingerprint,
  createPreviewTaskIdempotently,
  getPreviewIdempotencyStore,
  PreviewIdempotencyError,
} from "@/lib/preview-idempotency";
import { requireDemoRequestAccess } from "@/lib/demo-route-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  const accessFailure = requireDemoRequestAccess(request);
  if (accessFailure) return accessFailure;

  try {
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (
      !idempotencyKey ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey,
      )
    ) {
      return NextResponse.json({ error: "A valid preview request key is required." }, { status: 400 });
    }

    const store = getPreviewIdempotencyStore();
    if (!store) {
      throw new PreviewIdempotencyError(
        "Preview generation is disabled until a durable shared idempotency store is configured.",
        503,
      );
    }

    const form = await request.formData();
    const source = form.get("source");
    const reference = form.get("reference");
    const templateId = form.get("templateId");
    if (!(source instanceof File)) {
      return NextResponse.json({ error: "Upload a photo of yourself first." }, { status: 400 });
    }
    if (!ACCEPTED_IMAGE_TYPES.has(source.type) || source.size <= 0 || source.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "The portrait must be a JPEG, PNG, or WebP image smaller than 10 MB." },
        { status: 400 },
      );
    }
    if (reference !== null && !(reference instanceof File)) {
      return NextResponse.json({ error: "The hairstyle reference is invalid." }, { status: 400 });
    }
    if (
      reference instanceof File &&
      reference.size > 0 &&
      (!ACCEPTED_IMAGE_TYPES.has(reference.type) ||
        reference.size > MAX_IMAGE_BYTES)
    ) {
      return NextResponse.json(
        { error: "The hairstyle reference must be a JPEG, PNG, or WebP image smaller than 10 MB." },
        { status: 400 },
      );
    }
    if (templateId !== null && typeof templateId !== "string") {
      return NextResponse.json({ error: "Choose a valid hairstyle." }, { status: 400 });
    }

    const referenceFile = reference instanceof File && reference.size > 0 ? reference : null;
    const presetId = typeof templateId === "string" && templateId ? templateId : null;
    if (Boolean(referenceFile) === Boolean(presetId)) {
      return NextResponse.json(
        { error: "Choose exactly one preset or custom hairstyle reference." },
        { status: 400 },
      );
    }

    const fingerprint = await createPreviewFingerprint(source, referenceFile, presetId);
    const outcome = await createPreviewTaskIdempotently(
      store,
      idempotencyKey,
      fingerprint,
      () => createHairstyleTask(source, referenceFile, presetId),
    );
    if (outcome.kind === "processing") {
      return NextResponse.json(
        { error: "This preview request is already being processed. Wait before retrying." },
        { status: 409 },
      );
    }
    if (outcome.kind === "uncertain") {
      return NextResponse.json(
        {
          error:
            "The provider may have created this preview, but its status is uncertain. Do not retry with a new request key.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ taskId: outcome.taskId, replayed: outcome.replayed });
  } catch (error) {
    const status =
      error instanceof PreviewIdempotencyError || error instanceof YouCamError
        ? error.status
        : 500;
    const message = error instanceof Error ? error.message : "Could not start the preview.";
    return NextResponse.json({ error: message }, { status });
  }
}
