import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoSessionToken,
  DEMO_SESSION_DURATION_SECONDS,
  getDemoAccessConfig,
  getDemoAccessDecision,
  getDemoRequestAccessDecision,
  isDemoAccessCodeValid,
  isDemoSessionValid,
} from "../lib/demo-access.ts";

const now = Date.UTC(2026, 9, 26, 12);
const env = {
  DEMO_ACCESS_CODE: "cutmatch-judge-code-9f7a3b1c5d8e",
  DEMO_SESSION_SECRET: "demo-session-signing-secret-test-123456",
};
const config = getDemoAccessConfig(env);

test("valid access code is accepted and invalid codes are rejected", () => {
  assert.ok(config);
  assert.equal(isDemoAccessCodeValid(env.DEMO_ACCESS_CODE, config), true);
  assert.equal(isDemoAccessCodeValid("wrong-code", config), false);
  assert.equal(isDemoAccessCodeValid(null, config), false);
});

test("session cookie token is signed and valid until its expiry", () => {
  assert.ok(config);
  const token = createDemoSessionToken(config, now);
  assert.equal(isDemoSessionValid(token, config, now), true);
  assert.equal(
    isDemoSessionValid(
      token,
      config,
      now + DEMO_SESSION_DURATION_SECONDS * 1000 - 1000,
    ),
    true,
  );
});

test("tampered session tokens are rejected", () => {
  assert.ok(config);
  const token = createDemoSessionToken(config, now);
  const [payload, signature] = token.split(".");
  const tampered = `${payload}.${signature.slice(0, -1)}${signature.endsWith("A") ? "B" : "A"}`;
  assert.equal(isDemoSessionValid(tampered, config, now), false);
});

test("expired session tokens are rejected", () => {
  assert.ok(config);
  const token = createDemoSessionToken(config, now);
  assert.equal(
    isDemoSessionValid(
      token,
      config,
      now + DEMO_SESSION_DURATION_SECONDS * 1000,
    ),
    false,
  );
});

test("missing, short, and placeholder configuration fails closed", () => {
  assert.equal(getDemoAccessConfig({}), null);
  assert.equal(
    getDemoAccessConfig({
      DEMO_ACCESS_CODE: "short",
      DEMO_SESSION_SECRET: env.DEMO_SESSION_SECRET,
    }),
    null,
  );
  assert.equal(
    getDemoAccessConfig({
      DEMO_ACCESS_CODE: env.DEMO_ACCESS_CODE,
      DEMO_SESSION_SECRET: "replace_with_a_secret_that_is_long_enough",
    }),
    null,
  );
  assert.equal(isDemoAccessCodeValid(env.DEMO_ACCESS_CODE, null), false);
  assert.equal(isDemoSessionValid("anything", null), false);
});

test("changing either secret invalidates sessions", () => {
  assert.ok(config);
  const token = createDemoSessionToken(config, now);
  const changedCode = getDemoAccessConfig({
    ...env,
    DEMO_ACCESS_CODE: "different-judge-code-9f7a3b1c5d8e",
  });
  const changedSecret = getDemoAccessConfig({
    ...env,
    DEMO_SESSION_SECRET: "different-session-signing-secret-123456",
  });
  assert.equal(isDemoSessionValid(token, changedCode, now), false);
  assert.equal(isDemoSessionValid(token, changedSecret, now), false);
});

test("access decisions protect pages and APIs but keep access endpoints public", () => {
  assert.ok(config);
  const token = createDemoSessionToken(config, now);
  assert.equal(getDemoAccessDecision("/api/demo-access", null, env, now), "public");
  assert.equal(getDemoAccessDecision("/access", null, env, now), "public");
  assert.equal(getDemoAccessDecision("/", null, env, now), "redirect-access");
  assert.equal(getDemoAccessDecision("/api/preview", null, env, now), "unauthorized");
  assert.equal(getDemoAccessDecision("/api/templates", token, env, now), "allow");
  assert.equal(
    getDemoAccessDecision("/api/tasks/task-id/result", token, env, now),
    "allow",
  );
  assert.equal(getDemoAccessDecision("/", token, env, now), "allow");
  assert.equal(getDemoAccessDecision("/access", token, env, now), "access-page");
});

test("protected APIs return unavailable when demo configuration is missing", () => {
  assert.equal(getDemoAccessDecision("/api/preview", null, {}, now), "unavailable");
  assert.equal(getDemoAccessDecision("/", null, {}, now), "redirect-access");
});

test("direct API authorization accepts only a valid signed session cookie", () => {
  assert.ok(config);
  const token = createDemoSessionToken(config, now);
  assert.equal(getDemoRequestAccessDecision(null, env, now), "unauthorized");
  assert.equal(
    getDemoRequestAccessDecision(`cutmatch_demo_session=${token}`, env, now),
    "allow",
  );
  assert.equal(
    getDemoRequestAccessDecision(`cutmatch_demo_session=${token}tampered`, env, now),
    "unauthorized",
  );
  assert.equal(getDemoRequestAccessDecision(null, {}, now), "unavailable");
});
