import { NextResponse } from "next/server";
import { getDemoRequestAccessDecision } from "@/lib/demo-access";

export function requireDemoRequestAccess(request: Request) {
  const decision = getDemoRequestAccessDecision(request.headers.get("cookie"));
  if (decision === "allow") return null;

  const status = decision === "unavailable" ? 503 : 401;
  return NextResponse.json(
    {
      error:
        status === 503
          ? "Private demo access is not configured."
          : "Enter the private demo access code to continue.",
    },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
