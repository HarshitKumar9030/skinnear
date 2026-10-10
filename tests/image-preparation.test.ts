import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { ImagePreparationService } from "../src/services/ImagePreparationService";

test("phone photos are rotated, resized, converted to JPEG and stripped of EXIF", async () => {
  const bytes = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#e0d0c0" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const output = await new ImagePreparationService().prepare(new File([new Uint8Array(bytes)], "private-name.jpg", { type: "image/jpeg" }));
  const info = await sharp(Buffer.from(await output.arrayBuffer())).metadata();
  assert.equal(output.name, "selfie.jpg"); assert.equal(output.type, "image/jpeg");
  assert.equal(info.height, 2560); assert.ok(info.width! >= 480); assert.equal(info.exif, undefined);
});
test("invalid, mislabeled, empty, tiny and extremely narrow images fail before transfer", async () => {
  const service = new ImagePreparationService();
  await assert.rejects(service.prepare(new File(["not an image"], "fake.jpg", { type: "image/jpeg" })), /decoded/);
  await assert.rejects(service.prepare(new File([], "empty.png", { type: "image/png" })), /valid JPEG/);
  const tiny = await sharp({ create: { width: 300, height: 300, channels: 3, background: "white" } }).png().toBuffer();
  await assert.rejects(service.prepare(new File([new Uint8Array(tiny)], "tiny.png", { type: "image/png" })), /480 pixels/);
  const narrow = await sharp({ create: { width: 480, height: 5000, channels: 3, background: "white" } }).png().toBuffer();
  await assert.rejects(service.prepare(new File([new Uint8Array(narrow)], "narrow.png", { type: "image/png" })), /too narrow/);
});
