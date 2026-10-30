import { test } from "node:test";
import assert from "node:assert/strict";
import { CameraCaptureService, cameraErrorMessage } from "../src/services/CameraCaptureService";
import { orderedSkinScores } from "../src/domain/skin-focus";

function streamFixture() {
  let stops = 0;
  const track = {
    readyState: "live",
    stop: () => {
      stops++;
    },
  };
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, stops: () => stops };
}

test("camera requests video only and releases the previous camera before switching", async () => {
  const first = streamFixture();
  const second = streamFixture();
  const calls: MediaStreamConstraints[] = [];
  const service = new CameraCaptureService({
    getUserMedia: async (constraints) => {
      calls.push(constraints ?? {});
      if (calls.length === 2) assert.equal(first.stops(), 1);
      return calls.length === 1 ? first.stream : second.stream;
    },
    enumerateDevices: async () => [],
  });
  await service.open("user");
  await service.open("environment");
  assert.equal(calls[0].audio, false);
  assert.deepEqual((calls[1].video as MediaTrackConstraints).facingMode, { ideal: "environment" });
  service.stop();
  service.stop();
  assert.equal(second.stops(), 1);
});

test("a camera permission response arriving after close is immediately released", async () => {
  const fixture = streamFixture();
  let finish!: (stream: MediaStream) => void;
  const service = new CameraCaptureService({
    getUserMedia: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
    enumerateDevices: async () => [],
  });
  const pending = service.open("user");
  service.stop();
  finish(fixture.stream);
  assert.equal(await pending, null);
  assert.equal(fixture.stops(), 1);
});

test("overlapping camera switches cannot attach an older stream", async () => {
  const old = streamFixture();
  const current = streamFixture();
  const pending: ((stream: MediaStream) => void)[] = [];
  const service = new CameraCaptureService({
    getUserMedia: () =>
      new Promise((resolve) => {
        pending.push(resolve);
      }),
    enumerateDevices: async () => [],
  });
  const first = service.open("user");
  const second = service.open("environment");
  pending[1](current.stream);
  assert.equal(await second, current.stream);
  pending[0](old.stream);
  assert.equal(await first, null);
  assert.equal(old.stops(), 1);
  assert.equal(current.stops(), 0);
  service.stop();
});

test("camera capture rejects unreadable and undersized frames before encoding", async () => {
  const fixture = streamFixture();
  const service = new CameraCaptureService({
    getUserMedia: async () => fixture.stream,
    enumerateDevices: async () => [],
  });
  await service.open("user");
  await assert.rejects(service.capture({ readyState: 1 } as HTMLVideoElement), /paused/);
  await assert.rejects(
    service.capture({ readyState: 2, videoWidth: 320, videoHeight: 240 } as HTMLVideoElement),
    /resolution/,
  );
  service.stop();
  await assert.rejects(service.capture({ readyState: 2 } as HTMLVideoElement), /paused/);
});

test("device enumeration failure keeps the single-camera fallback usable", async () => {
  const service = new CameraCaptureService({
    getUserMedia: async () => streamFixture().stream,
    enumerateDevices: async () => {
      throw new Error("denied");
    },
  });
  assert.equal(await service.hasMultipleCameras(), false);
  assert.match(
    cameraErrorMessage(new DOMException("private detail", "NotAllowedError")),
    /upload a selfie/,
  );
  assert.match(
    cameraErrorMessage(new DOMException("private detail", "NotReadableError")),
    /another app/,
  );
});

test("skin focus orders the actual scores without changing the source report", () => {
  const analysis = {
    mode: "live" as const,
    scores: [
      { concern: "pore" as const, score: 80 },
      { concern: "moisture" as const, score: 45 },
    ],
  };
  assert.equal(orderedSkinScores(analysis)[0].concern, "moisture");
  assert.equal(analysis.scores[0].concern, "pore");
});

test("capture encodes the centered visible square and cannot finish after close", async () => {
  const previousDocument = globalThis.document;
  const fixture = streamFixture();
  const draws: unknown[][] = [];
  let finish!: BlobCallback;
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: (...args: unknown[]) => draws.push(args) }),
    toBlob: (callback: BlobCallback) => {
      finish = callback;
    },
  };
  globalThis.document = { createElement: () => canvas } as unknown as Document;
  const service = new CameraCaptureService({
    getUserMedia: async () => fixture.stream,
    enumerateDevices: async () => [],
  });
  try {
    await service.open("user");
    const video = { readyState: 2, videoWidth: 1920, videoHeight: 1080 } as HTMLVideoElement;
    const captured = service.capture(video);
    assert.deepEqual(draws[0].slice(1), [420, 0, 1080, 1080, 0, 0, 1080, 1080]);
    finish(new Blob(["encoded-image"], { type: "image/jpeg" }));
    const photo = await captured;
    assert.equal(photo.type, "image/jpeg");
    assert.equal(photo.name, "camera-selfie.jpg");
    const cancelled = service.capture(video);
    service.stop();
    finish(new Blob(["encoded-image"], { type: "image/jpeg" }));
    await assert.rejects(cancelled, { name: "AbortError" });
  } finally {
    service.stop();
    globalThis.document = previousDocument;
  }
});

test("cameras without facing metadata switch to a different device ID", async () => {
  const first = streamFixture();
  const second = streamFixture();
  const track = first.stream.getVideoTracks()[0];
  track.getSettings = () => ({ deviceId: "front-device" });
  const calls: MediaStreamConstraints[] = [];
  const service = new CameraCaptureService({
    getUserMedia: async (constraints) => {
      calls.push(constraints ?? {});
      return calls.length === 1 ? first.stream : second.stream;
    },
    enumerateDevices: async () =>
      [
        { kind: "videoinput", deviceId: "front-device" },
        { kind: "videoinput", deviceId: "rear-device" },
      ] as MediaDeviceInfo[],
  });
  await service.open("user");
  await service.open("environment");
  assert.deepEqual((calls[1].video as MediaTrackConstraints).deviceId, { exact: "rear-device" });
  assert.equal(first.stops(), 1);
  service.stop();
});
