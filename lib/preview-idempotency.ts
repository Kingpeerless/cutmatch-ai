import { createHash, randomUUID } from "node:crypto";

const REDIS_KEY_PREFIX = "cutmatch:preview:idempotency:v1:";

export type PreviewIdempotencyState = "processing" | "uncertain" | "completed";

export type PreviewIdempotencyRecord = {
  fingerprint: string;
  state: PreviewIdempotencyState;
  ownerToken: string;
  taskId?: string;
};

export type PreviewIdempotencyClaim =
  | { kind: "claimed" }
  | { kind: "existing"; record: PreviewIdempotencyRecord };

export interface PreviewIdempotencyStore {
  // claim atomically creates a processing record or returns the existing one.
  claim(
    key: string,
    fingerprint: string,
    ownerToken: string,
  ): Promise<PreviewIdempotencyClaim>;
  // Must atomically save the task ID only for the matching fingerprint and claim owner.
  complete(
    key: string,
    fingerprint: string,
    ownerToken: string,
    taskId: string,
  ): Promise<void>;
  // Only the matching owner may release a processing claim after a definite no-task outcome.
  release(key: string, fingerprint: string, ownerToken: string): Promise<void>;
  // Only the matching owner may transition processing to uncertain; completed state must not be downgraded.
  markUncertain(key: string, fingerprint: string, ownerToken: string): Promise<void>;
}

export class PreviewIdempotencyError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const COMPLETE_SCRIPT = `
local raw = redis.call("GET", KEYS[1])
if not raw then return "MISSING" end
local record = cjson.decode(raw)
if record.fingerprint ~= ARGV[1] then return "FINGERPRINT_MISMATCH" end
if record.ownerToken ~= ARGV[2] then return "OWNER_MISMATCH" end
if record.state == "completed" then
  if record.taskId == ARGV[3] then return "ALREADY_COMPLETED" end
  return "STATE_MISMATCH"
end
if record.state ~= "processing" then return "STATE_MISMATCH" end
record.state = "completed"
record.taskId = ARGV[3]
redis.call("SET", KEYS[1], cjson.encode(record))
return "OK"
`;

const UNCERTAIN_SCRIPT = `
local raw = redis.call("GET", KEYS[1])
if not raw then return "MISSING" end
local record = cjson.decode(raw)
if record.fingerprint ~= ARGV[1] then return "FINGERPRINT_MISMATCH" end
if record.ownerToken ~= ARGV[2] then return "OWNER_MISMATCH" end
if record.state == "completed" or record.state == "uncertain" then return "UNCHANGED" end
if record.state ~= "processing" then return "STATE_MISMATCH" end
record.state = "uncertain"
redis.call("SET", KEYS[1], cjson.encode(record))
return "OK"
`;

const RELEASE_SCRIPT = `
local raw = redis.call("GET", KEYS[1])
if not raw then return "MISSING" end
local record = cjson.decode(raw)
if record.fingerprint ~= ARGV[1] then return "FINGERPRINT_MISMATCH" end
if record.ownerToken ~= ARGV[2] then return "OWNER_MISMATCH" end
if record.state ~= "processing" then return "STATE_MISMATCH" end
redis.call("DEL", KEYS[1])
return "OK"
`;

type RedisCommandResponse = {
  result?: unknown;
  error?: unknown;
};

type RedisFetcher = typeof fetch;

function redisKey(key: string) {
  const digest = createHash("sha256").update(key).digest("hex");
  return `${REDIS_KEY_PREFIX}${digest}`;
}

function parseStoredRecord(value: unknown): PreviewIdempotencyRecord {
  if (typeof value !== "string") {
    throw new PreviewIdempotencyError("The durable idempotency store returned malformed data.", 503);
  }

  let record: unknown;
  try {
    record = JSON.parse(value);
  } catch {
    throw new PreviewIdempotencyError("The durable idempotency store returned malformed data.", 503);
  }

  if (
    !record ||
    typeof record !== "object" ||
    !("fingerprint" in record) ||
    typeof record.fingerprint !== "string" ||
    !/^[a-f0-9]{64}$/i.test(record.fingerprint) ||
    !("ownerToken" in record) ||
    typeof record.ownerToken !== "string" ||
    !("state" in record) ||
    !["processing", "uncertain", "completed"].includes(String(record.state))
  ) {
    throw new PreviewIdempotencyError("The durable idempotency store returned malformed data.", 503);
  }

  const parsed = record as PreviewIdempotencyRecord;
  if (parsed.state === "completed" && (typeof parsed.taskId !== "string" || !parsed.taskId)) {
    throw new PreviewIdempotencyError("The durable idempotency store returned malformed data.", 503);
  }
  return parsed;
}

export function createUpstashPreviewIdempotencyStore(
  restUrl: string,
  restToken: string,
  fetcher: RedisFetcher = fetch,
): PreviewIdempotencyStore {
  let endpoint: URL;
  try {
    endpoint = new URL(restUrl);
  } catch {
    throw new PreviewIdempotencyError("The durable idempotency store is not configured correctly.", 503);
  }
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    !restToken.trim()
  ) {
    throw new PreviewIdempotencyError("The durable idempotency store is not configured correctly.", 503);
  }

  async function command(parts: Array<string | number>) {
    let response: Response;
    try {
      response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${restToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parts),
        cache: "no-store",
      });
    } catch {
      throw new PreviewIdempotencyError("The durable idempotency store is unavailable.", 503);
    }

    if (!response.ok) {
      throw new PreviewIdempotencyError("The durable idempotency store is unavailable.", 503);
    }
    let body: RedisCommandResponse;
    try {
      body = (await response.json()) as RedisCommandResponse;
    } catch {
      throw new PreviewIdempotencyError("The durable idempotency store returned malformed data.", 503);
    }
    if (!body || typeof body !== "object" || "error" in body || !("result" in body)) {
      throw new PreviewIdempotencyError("The durable idempotency store returned malformed data.", 503);
    }
    return body.result;
  }

  async function transition(
    script: string,
    key: string,
    fingerprint: string,
    ownerToken: string,
    taskId?: string,
  ) {
    const result = await command([
      "EVAL",
      script,
      1,
      redisKey(key),
      fingerprint,
      ownerToken,
      ...(taskId ? [taskId] : []),
    ]);
    if (result === "OK" || result === "ALREADY_COMPLETED" || result === "UNCHANGED") return;
    throw new PreviewIdempotencyError("The durable idempotency record could not be updated safely.", 503);
  }

  return {
    async claim(key, fingerprint, ownerToken) {
      const serialized = JSON.stringify({ fingerprint, ownerToken, state: "processing" });
      const setResult = await command(["SET", redisKey(key), serialized, "NX"]);
      if (setResult === "OK") return { kind: "claimed" };
      if (setResult !== null) {
        throw new PreviewIdempotencyError("The durable idempotency store returned malformed data.", 503);
      }

      const existing = await command(["GET", redisKey(key)]);
      if (existing === null) {
        throw new PreviewIdempotencyError("The durable idempotency store returned malformed data.", 503);
      }
      return { kind: "existing", record: parseStoredRecord(existing) };
    },
    async complete(key, fingerprint, ownerToken, taskId) {
      await transition(COMPLETE_SCRIPT, key, fingerprint, ownerToken, taskId);
    },
    async release(key, fingerprint, ownerToken) {
      await transition(RELEASE_SCRIPT, key, fingerprint, ownerToken);
    },
    async markUncertain(key, fingerprint, ownerToken) {
      await transition(UNCERTAIN_SCRIPT, key, fingerprint, ownerToken);
    },
  };
}

export type PreviewTaskOutcome =
  | { kind: "completed"; taskId: string; replayed: boolean }
  | { kind: "processing" }
  | { kind: "uncertain" };

export async function createPreviewFingerprint(
  source: File,
  reference: File | null,
  templateId: string | null,
) {
  async function fileDigest(file: File | null) {
    if (!file) return null;
    const bytes = Buffer.from(await file.arrayBuffer());
    return {
      contentType: file.type,
      size: file.size,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }

  const request = {
    source: await fileDigest(source),
    reference: await fileDigest(reference),
    templateId,
  };
  return createHash("sha256").update(JSON.stringify(request)).digest("hex");
}

export async function createPreviewTaskIdempotently(
  store: PreviewIdempotencyStore | null,
  key: string,
  fingerprint: string,
  createTask: () => Promise<string>,
  isDefinitelyNotCreated: (error: unknown) => boolean = () => false,
): Promise<PreviewTaskOutcome> {
  if (!store) {
    throw new PreviewIdempotencyError(
      "Preview generation is disabled until a durable shared idempotency store is configured.",
      503,
    );
  }

  const ownerToken = randomUUID();
  let claim: PreviewIdempotencyClaim;
  try {
    claim = await store.claim(key, fingerprint, ownerToken);
  } catch {
    throw new PreviewIdempotencyError(
      "The durable idempotency store is unavailable. No preview was started.",
      503,
    );
  }
  if (claim.kind === "existing") {
    if (claim.record.fingerprint !== fingerprint) {
      throw new PreviewIdempotencyError(
        "This request key was already used with different preview inputs. Start a new request.",
        409,
      );
    }
    if (claim.record.state === "completed" && claim.record.taskId) {
      return { kind: "completed", taskId: claim.record.taskId, replayed: true };
    }
    if (claim.record.state === "completed") return { kind: "uncertain" };
    return { kind: claim.record.state };
  }

  let taskId: string;
  try {
    taskId = await createTask();
  } catch (error) {
    if (isDefinitelyNotCreated(error)) {
      try {
        await store.release(key, fingerprint, ownerToken);
      } catch {
        throw new PreviewIdempotencyError(
          "The task was not created, but its retry record could not be released safely. Contact support before retrying.",
          503,
        );
      }
      throw error;
    }

    try {
      await store.markUncertain(key, fingerprint, ownerToken);
    } catch {
      throw new PreviewIdempotencyError(
        "The provider may have created this preview, but its status could not be saved safely. Do not retry with a new request key.",
        503,
      );
    }
    return { kind: "uncertain" };
  }

  try {
    await store.complete(key, fingerprint, ownerToken, taskId);
  } catch {
    try {
      await store.markUncertain(key, fingerprint, ownerToken);
    } catch {
      throw new PreviewIdempotencyError(
        "The provider may have created this preview, but its status could not be saved safely. Do not retry with a new request key.",
        503,
      );
    }
    return { kind: "uncertain" };
  }

  return { kind: "completed", taskId, replayed: false };
}

export function getPreviewIdempotencyStore(): PreviewIdempotencyStore | null {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!restUrl || !restToken) return null;
  try {
    return createUpstashPreviewIdempotencyStore(restUrl, restToken);
  } catch {
    return null;
  }
}
