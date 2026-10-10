import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { YouCamService, YouCamTaskError } from "../src/services/YouCamService";
import { YouCamClient } from "../src/services/YouCamClient";
import { TaskTokenService } from "../src/services/TaskTokenService";

function fixture() {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.YOUCAM_API_KEY;
  const previousOrigin = process.env.YOUCAM_API_BASE_URL;
  process.env.YOUCAM_API_KEY = "test-only-key";
  delete process.env.YOUCAM_API_BASE_URL;
  return () => {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.YOUCAM_API_KEY; else process.env.YOUCAM_API_KEY = previousKey;
    if (previousOrigin === undefined) delete process.env.YOUCAM_API_BASE_URL; else process.env.YOUCAM_API_BASE_URL = previousOrigin;
  };
}
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status }); }

test("YouCam registers, uploads, starts and polls a live scan without sending the key to storage", async () => {
  const restore = fixture();
  const calls: { url: string; options?: RequestInit }[] = [];
  globalThis.fetch = async (input, options) => {
    const url = String(input); calls.push({ url, options });
    if (url.endsWith("/file")) return json({ status: 200, data: { files: [{ file_id: "file-id", requests: [{ method: "PUT", url: "https://yce-us.s3-accelerate.amazonaws.com/test", headers: { "Content-Type": "image/png" } }] }] } });
    if (url.includes("amazonaws.com")) return new Response(null, { status: 200 });
    if (options?.method === "POST") return json({ status: 200, data: { task_id: "task/id" } });
    if (calls.length === 4) return json({ status: 200, data: { task_status: "running" } });
    return json({ status: 200, data: { task_status: "success", results: { output: [
      { type: "moisture", ui_score: 72, mask_urls: ["http://unsafe.example/mask", "https://example.com/mask"] },
      { type: "pore", ui_score: 83 }, { type: "unknown", ui_score: 90 },
    ] } } });
  };
  try {
    const service = new YouCamService();
    const token = await service.start(new File([new Uint8Array([1, 2, 3])], "private-name.png", { type: "image/png" }));
    assert.notEqual(token, "task/id");
    assert.equal(new TaskTokenService().verify(token), "task/id");
    assert.equal((calls[0].options?.headers as Record<string, string>).Authorization, "Bearer test-only-key");
    const metadata = JSON.parse(String(calls[0].options?.body));
    assert.equal(metadata.files[0].file_name, "selfie.png");
    assert.equal(metadata.files[0].file_size, 3);
    assert.equal((calls[1].options?.headers as Record<string, string>).Authorization, undefined);
    assert.equal(calls[1].options?.redirect, "error");
    assert.deepEqual(Array.from(new Uint8Array(calls[1].options?.body as ArrayBuffer)), [1, 2, 3]);
    assert.deepEqual(JSON.parse(String(calls[2].options?.body)).dst_actions, ["moisture", "redness", "oiliness", "pore", "acne"]);
    assert.deepEqual(await service.status(token), { status: "running" });
    assert.equal(calls[3].url.endsWith("task%2Fid"), true);
    assert.deepEqual(await service.status(token), { status: "success", analysis: { mode: "live", scores: [
      { concern: "moisture", score: 72, maskUrl: "https://example.com/mask" }, { concern: "pore", score: 83, maskUrl: undefined },
    ] } });
  } finally { restore(); }
});

test("provider authentication and malformed response errors are sanitized", async () => {
  const restore = fixture();
  try {
    globalThis.fetch = async () => json({ error: "private provider details test-only-key" }, 401);
    await assert.rejects(new YouCamClient().request("/test", z.object({})), /YouCam rejected the API key/);
    globalThis.fetch = async () => json({ status: 200, data: { files: [] } });
    await assert.rejects(new YouCamService().start(new File(["test"], "photo.png", { type: "image/png" })), /invalid file registration response/);
    globalThis.fetch = async () => json({ status: 429, error: "private details" });
    await assert.rejects(new YouCamClient().request("/test", z.object({})), /YouCam is busy/);
  } finally { restore(); }
});

test("documented metadata entries do not invalidate completed skin scores", async () => {
  const restore = fixture();
  try {
    const token = new TaskTokenService().issue("task-with-metadata");
    // https://docs.perfectcorp.com/reference/ai_skin_analysis — JSON result example.
    globalThis.fetch = async () => json({ status: 200, error_code: null, data: {
      task_status: "success", error: null, results: { output: [
        { type: "moisture", raw_score: 65.3, ui_score: 72, mask_urls: ["https://example.com/moisture.jpg"] },
        { type: "redness", ui_score: 80, mask_urls: null },
        { type: "oiliness", ui_score: 63, mask_urls: [null, 123, "javascript:alert(1)"] },
        { type: "pore", ui_score: 83 },
        { type: "skin_type", region: "whole", skin_type: "Combination" },
        { type: "skin_age", score: 29 },
        { type: "all", score: 28.5 },
        { type: "resize_image", mask_urls: ["https://example.com/resized.jpg"] },
      ] },
    } });
    const result = await new YouCamService().status(token);
    assert.equal(result.status, "success");
    assert.deepEqual(result.analysis?.scores.map(({ concern, score }) => ({ concern, score })), [
      { concern: "moisture", score: 72 }, { concern: "redness", score: 80 },
      { concern: "oiliness", score: 63 }, { concern: "pore", score: 83 },
    ]);
    assert.equal(result.analysis?.scores[0].maskUrl, "https://example.com/moisture.jpg");
    assert.equal(result.analysis?.scores[2].maskUrl, undefined);
  } finally { restore(); }
});

test("polling handles incomplete results and rejects ZIP or metadata-only success", async () => {
  const restore = fixture();
  try {
    const token = new TaskTokenService().issue("task-id");
    globalThis.fetch = async () => json({ data: { task_status: "running", results: { output: [null] } } });
    assert.deepEqual(await new YouCamService().status(token), { status: "running" });
    for (const results of [null, "https://example.com/results.zip", { url: "https://example.com/results.zip" }, { output: {} }]) {
      globalThis.fetch = async () => json({ data: { task_status: "success", results } });
      await assert.rejects(new YouCamService().status(token), (error: unknown) => error instanceof YouCamTaskError && error.status === 502 && /requested JSON results/.test(error.message));
    }
    globalThis.fetch = async () => json({ data: { task_status: "success", results: { output: [
      { type: "skin_age", score: 29 }, { type: "all", score: 90 },
      { type: "moisture", raw_score: 90 }, { type: "pore", ui_score: "90" }, null,
    ] } } });
    await assert.rejects(new YouCamService().status(token), /no supported scores/);
  } finally { restore(); }
});

test("documented insufficient credit error is an account error, not a photo error", async () => {
  const restore = fixture();
  try {
    for (const status of [200, 400]) {
      globalThis.fetch = async () => json({ status: 400, error_code: "CreditInsufficiency", error: "private details" }, status);
      await assert.rejects(new YouCamClient().request("/test", z.object({})), /account needs more units/);
    }
  } finally { restore(); }
});

test("failed scans and missing supported scores never become sample results", async () => {
  const restore = fixture();
  try {
    const token = new TaskTokenService().issue("task-id");
    globalThis.fetch = async () => json({ data: { task_status: "error", error: "unknown_internal_error", results: null } });
    await assert.rejects(new YouCamService().status(token), /front-facing photo/);
    globalThis.fetch = async () => json({ data: { task_status: "error", error: "error_no_face", results: null } });
    await assert.rejects(new YouCamService().status(token), /could not detect a face/);
    globalThis.fetch = async () => json({ data: { task_status: "error", error: "error_src_face_too_small", results: null } });
    await assert.rejects(new YouCamService().status(token), /60%/);
    globalThis.fetch = async () => json({ data: { task_status: "running", results: null } });
    assert.deepEqual(await new YouCamService().status(token), { status: "running" });
    globalThis.fetch = async () => json({ data: { task_status: "success", results: { output: [{ type: "moisture", ui_score: 101 }] } } });
    await assert.rejects(new YouCamService().status(token), /no supported scores/);
  } finally { restore(); }
});

test("unsupported upload destinations and missing credentials fail before photo transfer", async () => {
  const restore = fixture();
  let calls = 0;
  globalThis.fetch = async () => { calls++; return json({ data: { files: [{ file_id: "file-id", requests: [{ method: "PUT", url: "https://untrusted.example/upload", headers: {} }] }] } }); };
  try {
    const photo = new File(["test"], "photo.png", { type: "image/png" });
    await assert.rejects(new YouCamService().start(photo), /unsupported upload destination/);
    assert.equal(calls, 1);
    delete process.env.YOUCAM_API_KEY;
    await assert.rejects(new YouCamService().start(photo), /need a YouCam API key/);
    assert.equal(calls, 1);
    process.env.YOUCAM_API_KEY = "test-only-key";
    process.env.YOUCAM_API_BASE_URL = "http://example.com";
    await assert.rejects(new YouCamService().start(photo), /HTTPS origin/);
    assert.equal(calls, 1);
  } finally { restore(); }
});
