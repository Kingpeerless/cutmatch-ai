import { NextRequest, NextResponse } from "next/server";
import { listTemplates, YouCamError } from "@/lib/youcam";
import { requireDemoRequestAccess } from "@/lib/demo-route-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const accessFailure = requireDemoRequestAccess(request);
  if (accessFailure) return accessFailure;

  try {
    const startingToken = request.nextUrl.searchParams.get("starting_token") ?? undefined;
    return NextResponse.json(await listTemplates(startingToken));
  } catch (error) {
    const status = error instanceof YouCamError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not load hairstyles.";
    return NextResponse.json({ error: message }, { status });
  }
}
