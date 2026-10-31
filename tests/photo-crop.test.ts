import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CROP, cropGeometry, panCrop } from "../src/domain/photo-crop";
import { providerPhotoIssue, isPhotoIssue } from "../src/domain/photo-issues";
import { PhotoCropService } from "../src/services/PhotoCropService";
import { ApiRequestError, SkinNearApi } from "../src/lib/client-api";
import { errorResponse, AppError } from "../src/lib/errors";

test("square crops stay within portrait and landscape source bounds at every quarter turn", () => {
  for (const [width, height] of [
    [1920, 1080],
    [640, 1200],
    [200, 300],
  ]) {
    for (let turns = -4; turns <= 4; turns++) {
      for (const zoom of [1, 2, 20]) {
        const crop = cropGeometry(width, height, { x: 2, y: -1, zoom, turns });
        assert.ok(crop.left >= 0 && crop.top >= 0);
        assert.ok(crop.left + crop.side <= crop.rotatedWidth + 0.001);
        assert.ok(crop.top + crop.side <= crop.rotatedHeight + 0.001);
        assert.ok(crop.zoom >= 1 && crop.zoom <= 4);
        if (Math.abs(turns) % 2) assert.equal(crop.rotatedWidth, height);
      }
    }
  }
  assert.throws(() => cropGeometry(0, 600, DEFAULT_CROP), /dimensions/);
});

test("dragging follows the photo, clamps at its edges and does not divide by zero", () => {
  const crop = { ...DEFAULT_CROP, zoom: 2 };
  const moved = panCrop(1200, 800, crop, 100, -100, 400);
  assert.ok(moved.x < crop.x);
  assert.ok(moved.y > crop.y);
  const edge = panCrop(1200, 800, crop, 10000, -10000, 400);
  assert.equal(edge.x, 0);
  assert.equal(edge.y, 1);
  assert.deepEqual(panCrop(800, 800, DEFAULT_CROP, 100, 100, 400), DEFAULT_CROP);
  assert.equal(panCrop(800, 800, crop, 100, 100, 0), crop);
});

test("photo flags use an explicit allowlist and survive the API boundary", async () => {
  assert.equal(providerPhotoIssue("error_src_face_too_small"), "face-too-small");
  assert.equal(providerPhotoIssue("error_large_face_angle"), "face-angle");
  assert.equal(providerPhotoIssue("private_provider_failure"), undefined);
  assert.equal(providerPhotoIssue("constructor"), undefined);
  assert.equal(isPhotoIssue("private_provider_failure"), false);
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      errorResponse(new AppError("Reframe your photo.", 422, undefined, "face-too-small"));
    await assert.rejects(
      new SkinNearApi().request("/api/analysis/status"),
      (error) => error instanceof ApiRequestError && error.code === "face-too-small",
    );
    assert.deepEqual(await errorResponse(new AppError("Busy", 429)).json(), { error: "Busy" });
  } finally {
    globalThis.fetch = previous;
  }
});

test("crop decoding applies source orientation and releases oversized image resources", async () => {
  const previous = globalThis.createImageBitmap;
  let closed = 0;
  let options: ImageBitmapOptions | undefined;
  globalThis.createImageBitmap = (async (_source: unknown, nextOptions: ImageBitmapOptions) => {
    options = nextOptions;
    return {
      width: 10000,
      height: 5000,
      close: () => {
        closed++;
      },
    } as ImageBitmap;
  }) as typeof createImageBitmap;
  try {
    await assert.rejects(
      PhotoCropService.open(new File(["test"], "photo.jpg", { type: "image/jpeg" })),
      /too large/,
    );
    assert.deepEqual(options, { imageOrientation: "from-image" });
    assert.equal(closed, 1);
  } finally {
    globalThis.createImageBitmap = previous;
  }
});

test("crop export is a bounded JPEG and rotation renders from the original bitmap", async () => {
  const previousBitmap = globalThis.createImageBitmap;
  const previousDocument = globalThis.document;
  let closed = 0;
  let outputSize = 0;
  const translations: number[][] = [];
  const rotations: number[] = [];
  const image = {
    width: 1200,
    height: 800,
    close: () => {
      closed++;
    },
  } as ImageBitmap;
  const context = {
    clearRect() {},
    fillStyle: "",
    fillRect() {},
    save() {},
    restore() {},
    scale() {},
    translate: (...values: number[]) => translations.push(values),
    rotate: (value: number) => rotations.push(value),
    drawImage: (source: unknown) => assert.equal(source, image),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob: (callback: BlobCallback, mime: string) => {
      outputSize = canvas.width;
      callback(new Blob(["jpeg-bytes"], { type: mime }));
    },
  };
  globalThis.createImageBitmap = (async () => image) as typeof createImageBitmap;
  globalThis.document = { createElement: () => canvas } as unknown as Document;
  try {
    const service = await PhotoCropService.open(new File(["test"], "photo.jpg"));
    const photo = await service.export({ ...DEFAULT_CROP, turns: 1, zoom: 2 });
    assert.equal(photo.type, "image/jpeg");
    assert.equal(photo.name, "skin-crop.jpg");
    assert.equal(outputSize, 480);
    assert.deepEqual(translations[1], [400, 600]);
    assert.equal(rotations[0], Math.PI / 2);
    service.close();
    service.close();
    assert.equal(closed, 1);
    await assert.rejects(service.export(DEFAULT_CROP), /Reopen the crop editor/);
  } finally {
    globalThis.createImageBitmap = previousBitmap;
    globalThis.document = previousDocument;
  }
});
