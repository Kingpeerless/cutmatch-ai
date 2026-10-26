import assert from "node:assert/strict";
import test from "node:test";
import {
  createUpstashPreviewIdempotencyStore,
  createPreviewFingerprint,
  createPreviewTaskIdempotently,
  PreviewIdempotencyError,
} from "../lib/preview-idempotency.ts";

class TestStore {
  records = new Map();
  failComplete = false;

  async claim(key, fingerprint, ownerToken) {
    const current = this.records.get(key);
    if (current) return { kind: "existing", record: current };
    this.records.set(key, { fingerprint, state: "processing", ownerToken });
    return { kind: "claimed" };
  }

  async complete(key, fingerprint, ownerToken, taskId) {
    if (this.failComplete) throw new Error("test completion write failure");
    const record = this.records.get(key);
    assert.equal(record?.fingerprint, fingerprint);
    assert.equal(record?.ownerToken, ownerToken);
    this.records.set(key, { fingerprint, state: "completed", ownerToken, taskId });
  }

  async markUncertain(key, fingerprint, ownerToken) {
    const record = this.records.get(key);
    assert.equal(record?.fingerprint, fingerprint);
    assert.equal(record?.ownerToken, ownerToken);
    this.records.set(key, { fingerprint, state: "uncertain" });
  }
}

test("repeated same-key requests reuse the original task", async () => {
  const store = new TestStore();
  let createCalls = 0;
  const createTask = async () => {
    createCalls += 1;
    return "task-123";
  };

  const first = await createPreviewTaskIdempotently(store, "request-1", "fp-a", createTask);
  const retry = await createPreviewTaskIdempotently(store, "request-1", "fp-a", createTask);

  assert.deepEqual(first, { kind: "completed", taskId: "task-123", replayed: false });
  assert.deepEqual(retry, { kind: "completed", taskId: "task-123", replayed: true });
  assert.equal(createCalls, 1);
});

test("concurrent requests only allow the atomic claim owner to create a task", async () => {
  const store = new TestStore();
  let createCalls = 0;
  let resolveTask;
  const createTask = () => {
    createCalls += 1;
    return new Promise((resolve) => {
      resolveTask = resolve;
    });
  };

  const firstPromise = createPreviewTaskIdempotently(store, "request-2", "fp-b", createTask);
  await new Promise((resolve) => setImmediate(resolve));
  const concurrent = await createPreviewTaskIdempotently(
    store,
    "request-2",
    "fp-b",
    createTask,
  );
  resolveTask("task-concurrent");
  const first = await firstPromise;

  assert.deepEqual(concurrent, { kind: "processing" });
  assert.deepEqual(first, {
    kind: "completed",
    taskId: "task-concurrent",
    replayed: false,
  });
  assert.equal(createCalls, 1);
});

test("same key with a different fingerprint is rejected", async () => {
  const store = new TestStore();
  let createCalls = 0;
  await createPreviewTaskIdempotently(store, "request-3", "fp-original", async () => {
    createCalls += 1;
    return "task-original";
  });

  await assert.rejects(
    createPreviewTaskIdempotently(store, "request-3", "fp-different", async () => {
      createCalls += 1;
      return "task-wrong";
    }),
    (error) => error instanceof PreviewIdempotencyError && error.status === 409,
  );
  assert.equal(createCalls, 1);
});

test("uncertain provider response is not retried", async () => {
  const store = new TestStore();
  let providerSideEffects = 0;
  const first = await createPreviewTaskIdempotently(store, "request-4", "fp-c", async () => {
    providerSideEffects += 1;
    throw new Error("provider response was lost after task creation");
  });
  const retry = await createPreviewTaskIdempotently(store, "request-4", "fp-c", async () => {
    providerSideEffects += 1;
    return "duplicate-task";
  });

  assert.deepEqual(first, { kind: "uncertain" });
  assert.deepEqual(retry, { kind: "uncertain" });
  assert.equal(providerSideEffects, 1);
});

test("task ID persistence failure is marked uncertain and not recreated", async () => {
  const store = new TestStore();
  store.failComplete = true;
  let providerSideEffects = 0;

  const first = await createPreviewTaskIdempotently(store, "request-5", "fp-d", async () => {
    providerSideEffects += 1;
    return "task-not-persisted";
  });
  store.failComplete = false;
  const retry = await createPreviewTaskIdempotently(store, "request-5", "fp-d", async () => {
    providerSideEffects += 1;
    return "duplicate-task";
  });

  assert.deepEqual(first, { kind: "uncertain" });
  assert.deepEqual(retry, { kind: "uncertain" });
  assert.equal(providerSideEffects, 1);
});

test("request fingerprint includes exact input content and selected generation input", async () => {
  const source = new File(["portrait"], "portrait.jpg", { type: "image/jpeg" });
  const reference = new File(["reference"], "style.jpg", { type: "image/jpeg" });
  const original = await createPreviewFingerprint(source, reference, null);
  const changedPortrait = await createPreviewFingerprint(
    new File(["other portrait"], "portrait.jpg", { type: "image/jpeg" }),
    reference,
    null,
  );
  const changedReference = await createPreviewFingerprint(
    source,
    new File(["other reference"], "style.jpg", { type: "image/jpeg" }),
    null,
  );
  const preset = await createPreviewFingerprint(source, null, "provider-template");

  assert.notEqual(original, changedPortrait);
  assert.notEqual(original, changedReference);
  assert.notEqual(original, preset);
});

test("missing durable store fails before invoking task creation", async () => {
  let createCalls = 0;
  await assert.rejects(
    createPreviewTaskIdempotently(null, "request-6", "fp-e", async () => {
      createCalls += 1;
      return "must-not-run";
    }),
    (error) => error instanceof PreviewIdempotencyError && error.status === 503,
  );
  assert.equal(createCalls, 0);
});

function mockRedisFetch(records = new Map(), options = {}) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), init });
    if (options.unavailable) throw new Error("mock network failure");
    const [operation, ...args] = JSON.parse(init.body);
    let result;
    if (operation === "SET") {
      const [key, value, nx] = args;
      if (nx !== "NX") throw new Error("expected NX");
      if (records.has(key)) result = null;
      else {
        records.set(key, value);
        result = "OK";
      }
    } else if (operation === "GET") {
      result = records.get(args[0]) ?? null;
    } else if (operation === "EVAL") {
      const [, script, , key, fingerprint, ownerToken, taskId] = [operation, ...args];
      const raw = records.get(key);
      if (!raw) result = "MISSING";
      else {
        const record = JSON.parse(raw);
        if (record.fingerprint !== fingerprint) result = "FINGERPRINT_MISMATCH";
        else if (record.ownerToken !== ownerToken) result = "OWNER_MISMATCH";
        else if (script.includes('record.state = "completed"')) {
          if (record.state === "completed" && record.taskId === taskId) result = "ALREADY_COMPLETED";
          else if (record.state !== "processing") result = "STATE_MISMATCH";
          else {
            record.state = "completed";
            record.taskId = taskId;
            records.set(key, JSON.stringify(record));
            result = "OK";
          }
        } else if (script.includes('record.state = "uncertain"')) {
          if (record.state === "completed" || record.state === "uncertain") result = "UNCHANGED";
          else if (record.state !== "processing") result = "STATE_MISMATCH";
          else {
            record.state = "uncertain";
            records.set(key, JSON.stringify(record));
            result = "OK";
          }
        } else {
          result = "UNKNOWN_SCRIPT";
        }
      }
    } else {
      throw new Error(`Unexpected command ${operation}`);
    }

    return new Response(JSON.stringify({ result }), {
      status: options.malformed ? 200 : 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { fetcher, calls, records };
}

const TEST_REDIS_URL = "https://mock-redis.example";
const TEST_REDIS_TOKEN = "test-token-never-real";

test("Upstash adapter claims atomically, reads existing requests, and replays completed task", async () => {
  const mock = mockRedisFetch();
  const store = createUpstashPreviewIdempotencyStore(TEST_REDIS_URL, TEST_REDIS_TOKEN, mock.fetcher);
  const first = await store.claim("client-key", "a".repeat(64), "owner-a");
  const second = await store.claim("client-key", "a".repeat(64), "owner-b");

  assert.deepEqual(first, { kind: "claimed" });
  assert.deepEqual(second, {
    kind: "existing",
    record: {
      fingerprint: "a".repeat(64),
      ownerToken: "owner-a",
      state: "processing",
    },
  });
  assert.deepEqual(JSON.parse(mock.calls[0].init.body).slice(-1), ["NX"]);
  await store.complete("client-key", "a".repeat(64), "owner-a", "task-original");
  const completed = await store.claim("client-key", "a".repeat(64), "owner-c");
  assert.equal(completed.kind, "existing");
  assert.equal(completed.record.state, "completed");
  assert.equal(completed.record.taskId, "task-original");
  const replay = await createPreviewTaskIdempotently(
    store,
    "client-key",
    "a".repeat(64),
    async () => {
      throw new Error("completed requests must not create a new task");
    },
  );
  assert.deepEqual(replay, {
    kind: "completed",
    taskId: "task-original",
    replayed: true,
  });
  assert.equal(mock.calls[0].init.headers.Authorization, `Bearer ${TEST_REDIS_TOKEN}`);
  assert.ok(mock.calls[0].url.startsWith(TEST_REDIS_URL));
  assert.ok(!mock.calls[0].init.body.includes("client-key"));
  assert.equal(JSON.stringify(completed).includes(TEST_REDIS_TOKEN), false);
});

test("Upstash adapter atomically rejects mismatches and preserves completed state on uncertainty", async () => {
  const mock = mockRedisFetch();
  const store = createUpstashPreviewIdempotencyStore(TEST_REDIS_URL, TEST_REDIS_TOKEN, mock.fetcher);
  await store.claim("client-key", "b".repeat(64), "owner-b");

  await assert.rejects(
    store.complete("client-key", "c".repeat(64), "owner-b", "task-1"),
    (error) => error instanceof PreviewIdempotencyError && error.status === 503,
  );
  await assert.rejects(
    store.complete("client-key", "b".repeat(64), "wrong-owner", "task-1"),
    (error) => error instanceof PreviewIdempotencyError && error.status === 503,
  );
  await store.complete("client-key", "b".repeat(64), "owner-b", "task-1");
  await store.markUncertain("client-key", "b".repeat(64), "owner-b");
  const existing = await store.claim("client-key", "b".repeat(64), "new-owner");
  assert.equal(existing.record.state, "completed");
  assert.equal(existing.record.taskId, "task-1");
});

test("Upstash adapter fails closed for unavailable and malformed responses", async () => {
  const unavailable = mockRedisFetch(new Map(), { unavailable: true });
  const downStore = createUpstashPreviewIdempotencyStore(
    TEST_REDIS_URL,
    TEST_REDIS_TOKEN,
    unavailable.fetcher,
  );
  await assert.rejects(
    downStore.claim("key", "d".repeat(64), "owner"),
    (error) => error instanceof PreviewIdempotencyError && error.status === 503,
  );

  const malformedStore = createUpstashPreviewIdempotencyStore(
    TEST_REDIS_URL,
    TEST_REDIS_TOKEN,
    async () => new Response("{", { status: 200 }),
  );
  await assert.rejects(
    malformedStore.claim("key", "e".repeat(64), "owner"),
    (error) => error instanceof PreviewIdempotencyError && error.status === 503,
  );

  const malformedRecordStore = createUpstashPreviewIdempotencyStore(
    TEST_REDIS_URL,
    TEST_REDIS_TOKEN,
    async (_url, init) => {
      const [operation] = JSON.parse(init.body);
      return new Response(JSON.stringify({ result: operation === "SET" ? null : "not-json" }));
    },
  );
  await assert.rejects(
    malformedRecordStore.claim("key", "f".repeat(64), "owner"),
    (error) => error instanceof PreviewIdempotencyError && error.status === 503,
  );
});
