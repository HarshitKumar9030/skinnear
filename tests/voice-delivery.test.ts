import { test } from "node:test";
import assert from "node:assert/strict";
import { VoiceDeliveryService } from "../src/services/VoiceDeliveryService";
import { NarrationCaptionService } from "../src/services/NarrationCaptionService";

function recording(seconds: number, channels = 1) {
  const rate = 24000;
  const wav = Buffer.alloc(44 + rate * seconds * channels * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * channels * 2, 28);
  wav.writeUInt16LE(channels * 2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(wav.length - 44, 40);
  for (let offset = 44; offset < wav.length; offset += 2) wav.writeInt16LE(1000, offset);
  return wav;
}
test("voice delivery preserves duration and speech amplitude while reducing stereo PCM", () => {
  const result = new VoiceDeliveryService().prepare(recording(2, 2));
  assert.equal(result.readUInt16LE(22), 1);
  assert.equal(result.readUInt32LE(24), 16000);
  assert.equal(new NarrationCaptionService().duration(result), 2);
  assert.equal(result.readInt16LE(44), 1000);
});
test("long narration fits the base64 response budget without losing its ending", () => {
  const result = new VoiceDeliveryService().prepare(recording(170));
  assert.ok(result.toString("base64").length < 4.2 * 1024 * 1024);
  assert.ok(Math.abs(new NarrationCaptionService().duration(result) - 170) < 0.001);
  assert.equal(result.readInt16LE(result.length - 2), 1000);
});
test("invalid audio formats fail before a malformed recording reaches the player", () => {
  assert.throws(() => new VoiceDeliveryService().prepare(Buffer.alloc(8)), /recording format/);
  const wav = recording(1);
  wav.writeUInt16LE(32, 34);
  assert.throws(() => new VoiceDeliveryService().prepare(wav), /recording format/);
});
