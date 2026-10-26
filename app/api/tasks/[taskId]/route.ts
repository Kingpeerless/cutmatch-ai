import { NextRequest, NextResponse } from "next/server";
import { getTaskStatus, YouCamError } from "@/lib/youcam";
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
    return NextResponse.json(await getTaskStatus(taskId));
  } catch (error) {
    const status = error instanceof YouCamError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not check preview status.";
    return NextResponse.json({ error: message }, { status });
  }
}
