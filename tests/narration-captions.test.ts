import { test } from "node:test";
import assert from "node:assert/strict";
import { NarrationCaptionService } from "../src/services/NarrationCaptionService";

const service = new NarrationCaptionService();
test("speech alignment preserves approved names despite transcription errors", () => {
  const cues = service.align(
    "Welcome to SkinNear. Listen to your report.",
    ["Welcome", "to", "Skinyard.", "Listen", "to", "your", "report."].map((text, index) => ({
      text,
      start: index,
      end: index + 0.8,
    })),
    8,
  );
  assert.equal(
    cues.map((cue) => cue.text).join(" "),
    "Welcome to SkinNear. Listen to your report.",
  );
  assert.equal(cues[1].start, 3);
});
test("unrelated or invalid speech falls back without changing approved text", () => {
  assert.deepEqual(
    service.align("Cleanse and hydrate.", [{ text: "Unrelated", start: 0, end: 1 }], 2),
    [],
  );
  assert.deepEqual(service.align("Cleanse.", [{ text: "Cleanse.", start: NaN, end: 1 }], 2), []);
  assert.deepEqual(service.align("Cleanse.", [{ text: "Cleanse.", start: 0, end: 5 }], 2), []);
  const cues = service.estimate("Cleanse gently. Then hydrate your skin.", 12);
  assert.equal(cues.map((cue) => cue.text).join(" "), "Cleanse gently. Then hydrate your skin.");
  assert.equal(cues.at(-1)?.end, 12);
});
test("WAV duration follows sample bytes rather than total file length", () => {
  const wav = Buffer.alloc(44 + 96000);
  wav.write("RIFF", 0);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt32LE(48000, 28);
  wav.write("data", 36);
  wav.writeUInt32LE(96000, 40);
  assert.equal(service.duration(wav), 2);
  assert.equal(service.duration(Buffer.alloc(8)), 0);
});
