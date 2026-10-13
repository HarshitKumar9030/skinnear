import { test } from "node:test";
import assert from "node:assert/strict";
import { PhotoUploadService } from "../src/services/PhotoUploadService";

test("small photos retain their original file without a browser decode", async () => {
  const file = new File([new Uint8Array(100)], "photo.png", { type: "image/png" });
  assert.equal(await new PhotoUploadService().prepare(file), file);
});
test("large uploads are resized locally and decoding resources are released", async () => {
  const descriptors = ["document", "createImageBitmap"].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  let closed = false;
  let oversized = false;
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ fillRect() {}, drawImage() {}, fillStyle: "" }),
    toBlob: (callback: (blob: Blob) => void) =>
      callback(
        new Blob([new Uint8Array(oversized ? 4 * 1024 * 1024 : 100)], { type: "image/jpeg" }),
      ),
  };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => canvas },
  });
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    value: async () => ({
      width: 4000,
      height: 3000,
      close: () => {
        closed = true;
      },
    }),
  });
  try {
    const original = new File([new Uint8Array(4 * 1024 * 1024)], "photo.png", {
      type: "image/png",
    });
    const photo = await new PhotoUploadService().prepare(original);
    assert.equal(photo.type, "image/jpeg");
    assert.equal(canvas.width, 2048);
    assert.equal(canvas.height, 1536);
    assert.ok(closed);
    assert.ok(photo.size < 3 * 1024 * 1024);
    oversized = true;
    closed = false;
    await assert.rejects(new PhotoUploadService().prepare(original), /reduced for upload/);
    assert.ok(closed);
  } finally {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
