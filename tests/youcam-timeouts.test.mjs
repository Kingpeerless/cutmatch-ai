import assert from "node:assert/strict";
import test from "node:test";
import { fetchWithTimeout, YouCamError } from "../lib/youcam.ts";

test("timed-out YouCam requests abort and return a safe timeout error", async () => {
  let requestSignal;

  await assert.rejects(
    fetchWithTimeout(
      (signal) => {
        requestSignal = signal;
        return new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        });
      },
      5,
      "The YouCam request timed out.",
      "TASK_POLL_TIMEOUT",
    ),
    (error) =>
      error instanceof YouCamError &&
      error.status === 504 &&
      error.code === "TASK_POLL_TIMEOUT" &&
      error.message === "The YouCam request timed out.",
  );

  assert.equal(requestSignal.aborted, true);
});

test("successful requests clear the timeout without aborting", async () => {
  let requestSignal;

  const result = await fetchWithTimeout(
    async (signal) => {
      requestSignal = signal;
      return "ok";
    },
    5,
    "The YouCam request timed out.",
  );

  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(result, "ok");
  assert.equal(requestSignal.aborted, false);
});
