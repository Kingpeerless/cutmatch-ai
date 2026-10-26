import { NextResponse, type NextRequest } from "next/server";
import {
  DEMO_SESSION_COOKIE,
  getDemoAccessDecision,
} from "@/lib/demo-access";

export function proxy(request: NextRequest) {
  const decision = getDemoAccessDecision(
    request.nextUrl.pathname,
    request.cookies.get(DEMO_SESSION_COOKIE)?.value ?? null,
  );

  if (decision === "public") return NextResponse.next();

  if (decision === "access-page") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (decision === "unauthorized" || decision === "unavailable") {
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

  if (decision === "redirect-access") {
    const response = NextResponse.redirect(new URL("/access", request.url));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|design-reference/).*)"],
};
