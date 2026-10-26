import { NextRequest, NextResponse } from "next/server";
import { downloadTaskResult, YouCamError } from "@/lib/youcam";
import { requireDemoRequestAccess } from "@/lib/demo-route-auth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  const accessFailure = requireDemoRequestAccess(request);
  if (accessFailure) return accessFailure;

  try {
    const { taskId } = await context.params;
    const image = await downloadTaskResult(taskId);
    return new Response(image.body, {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof YouCamError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not retrieve the preview.";
    return NextResponse.json({ error: message }, { status });
  }
}
