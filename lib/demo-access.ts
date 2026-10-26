import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const DEMO_SESSION_COOKIE = "cutmatch_demo_session";
export const DEMO_SESSION_DURATION_SECONDS = 12 * 60 * 60;

export type DemoAccessConfig = {
  accessCode: string;
  sessionSecret: string;
};

export type DemoAccessDecision =
  | "public"
  | "allow"
  | "access-page"
  | "redirect-access"
  | "unauthorized"
  | "unavailable";

type DemoSessionPayload = {
  version: 1;
  issuedAt: number;
  expiresAt: number;
  codeDigest: string;
  nonce: string;
};

type Environment = Record<string, string | undefined>;

function isPlaceholder(value: string) {
  return /^(replace|change|your[_ -]?)/i.test(value);
}

export function getDemoAccessConfig(env: Environment = process.env): DemoAccessConfig | null {
  const accessCode = env.DEMO_ACCESS_CODE;
  const sessionSecret = env.DEMO_SESSION_SECRET;
  if (
    !accessCode ||
    accessCode.length < 24 ||
    isPlaceholder(accessCode) ||
    !sessionSecret ||
    Buffer.byteLength(sessionSecret, "utf8") < 32 ||
    isPlaceholder(sessionSecret)
  ) {
    return null;
  }
  return { accessCode, sessionSecret };
}

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

function safeEqual(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function isDemoAccessCodeValid(
  candidate: unknown,
  config: DemoAccessConfig | null,
): boolean {
  if (!config || typeof candidate !== "string" || candidate.length > 256) return false;
  return safeEqual(candidate, config.accessCode);
}

export function createDemoSessionToken(config: DemoAccessConfig, now = Date.now()) {
  const issuedAt = Math.floor(now / 1000);
  const payload: DemoSessionPayload = {
    version: 1,
    issuedAt,
    expiresAt: issuedAt + DEMO_SESSION_DURATION_SECONDS,
    codeDigest: digest(config.accessCode).toString("hex"),
    nonce: randomBytes(16).toString("base64url"),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signature(encodedPayload, config.sessionSecret)}`;
}

export function isDemoSessionValid(
  token: unknown,
  config: DemoAccessConfig | null,
  now = Date.now(),
): boolean {
  if (!config || typeof token !== "string" || token.length > 2048) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [encodedPayload, providedSignature] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(encodedPayload) || !/^[A-Za-z0-9_-]+$/.test(providedSignature)) {
    return false;
  }

  if (!safeEqual(providedSignature, signature(encodedPayload, config.sessionSecret))) return false;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (!payload || typeof payload !== "object") return false;

  const session = payload as Partial<DemoSessionPayload>;
  const nowSeconds = Math.floor(now / 1000);
  return (
    session.version === 1 &&
    Number.isSafeInteger(session.issuedAt) &&
    Number.isSafeInteger(session.expiresAt) &&
    session.expiresAt! > nowSeconds &&
    session.issuedAt! <= nowSeconds &&
    session.expiresAt! - session.issuedAt! === DEMO_SESSION_DURATION_SECONDS &&
    typeof session.codeDigest === "string" &&
    safeEqual(session.codeDigest, digest(config.accessCode).toString("hex")) &&
    typeof session.nonce === "string" &&
    /^[A-Za-z0-9_-]{22}$/.test(session.nonce)
  );
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0 || pair.slice(0, separator).trim() !== name) continue;
    return pair.slice(separator + 1).trim();
  }
  return null;
}

export function getDemoRequestAccessDecision(
  cookieHeader: string | null,
  env: Environment = process.env,
  now = Date.now(),
): "allow" | "unauthorized" | "unavailable" {
  const config = getDemoAccessConfig(env);
  if (!config) return "unavailable";
  const token = readCookie(cookieHeader, DEMO_SESSION_COOKIE);
  return isDemoSessionValid(token, config, now) ? "allow" : "unauthorized";
}

export function getDemoAccessDecision(
  pathname: string,
  token: string | null,
  env: Environment = process.env,
  now = Date.now(),
): DemoAccessDecision {
  if (pathname === "/api/demo-access") return "public";

  const config = getDemoAccessConfig(env);
  const authorized = isDemoSessionValid(token, config, now);
  if (pathname === "/access" || pathname === "/access/") {
    return authorized ? "access-page" : "public";
  }
  if (!config) return pathname.startsWith("/api/") ? "unavailable" : "redirect-access";
  if (!authorized) return pathname.startsWith("/api/") ? "unauthorized" : "redirect-access";
  return "allow";
}
