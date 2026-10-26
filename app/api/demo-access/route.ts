import { NextRequest, NextResponse } from "next/server";
import {
  createDemoSessionToken,
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_DURATION_SECONDS,
  getDemoAccessConfig,
  isDemoAccessCodeValid,
  isDemoSessionValid,
} from "@/lib/demo-access";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json(
    { error: "The access code is not valid." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  const config = getDemoAccessConfig();
  const authorized = isDemoSessionValid(
    request.cookies.get(DEMO_SESSION_COOKIE)?.value,
    config,
  );
  return NextResponse.json(
    { configured: Boolean(config), authorized },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const config = getDemoAccessConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Private demo access is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return unauthorized();
  }
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
      "application/json" ||
    Number(request.headers.get("content-length") ?? 0) > 4096
  ) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return unauthorized();
  }
  const code =
    body && typeof body === "object" && "code" in body
      ? (body as { code?: unknown }).code
      : undefined;
  if (!isDemoAccessCodeValid(code, config)) return unauthorized();

  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(DEMO_SESSION_COOKIE, createDemoSessionToken(config), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: DEMO_SESSION_DURATION_SECONDS,
  });
  return response;
}
