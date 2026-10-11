import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { ImagePreparationService } from "../src/services/ImagePreparationService";

test("phone photos are rotated, resized, converted to JPEG and stripped of EXIF", async () => {
  const bytes = await sharp({
    create: { width: 3000, height: 2000, channels: 3, background: "#e0d0c0" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const output = await new ImagePreparationService().prepare(
    new File([new Uint8Array(bytes)], "private-name.jpg", { type: "image/jpeg" }),
  );
  const info = await sharp(Buffer.from(await output.arrayBuffer())).metadata();
  assert.equal(output.name, "selfie.jpg");
  assert.equal(output.type, "image/jpeg");
  assert.equal(info.height, 2560);
  assert.ok(info.width! >= 480);
  assert.equal(info.exif, undefined);
});
test("invalid and empty images fail before transfer", async () => {
  const service = new ImagePreparationService();
  await assert.rejects(
    service.prepare(new File(["not an image"], "fake.jpg", { type: "image/jpeg" })),
    /decoded/,
  );
  await assert.rejects(
    service.prepare(new File([], "empty.png", { type: "image/png" })),
    /valid JPEG/,
  );
});
test("small photos automatically upscale while preserving their proportions", async () => {
  for (const [width, height, expectedWidth, expectedHeight] of [
    [300, 300, 480, 480],
    [400, 600, 480, 720],
    [800, 400, 960, 480],
  ]) {
    const bytes = await sharp({ create: { width, height, channels: 3, background: "white" } })
      .png()
      .toBuffer();
    const prepared = await new ImagePreparationService().prepare(
      new File([new Uint8Array(bytes)], "small.png", { type: "image/png" }),
    );
    const info = await sharp(Buffer.from(await prepared.arrayBuffer())).metadata();
    assert.equal(info.width, expectedWidth);
    assert.equal(info.height, expectedHeight);
  }
});
test("extremely narrow photos are padded to supported dimensions without cropping", async () => {
  const narrow = await sharp({
    create: { width: 480, height: 5000, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const prepared = await new ImagePreparationService().prepare(
    new File([new Uint8Array(narrow)], "narrow.png", { type: "image/png" }),
  );
  const info = await sharp(Buffer.from(await prepared.arrayBuffer())).metadata();
  assert.equal(info.width, 480);
  assert.equal(info.height, 2560);
});
