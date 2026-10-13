import { AppError } from "@/lib/errors";

/** Mono PCM keeps voice and caption JSON below the serverless response limit. */
export class VoiceDeliveryService {
  prepare(wav: Buffer): Buffer {
    let format: Buffer | undefined;
    let data: Buffer | undefined;
    for (let offset = 12; offset + 8 <= wav.length;) {
      const size = wav.readUInt32LE(offset + 4);
      if (offset + 8 + size > wav.length) break;
      const type = wav.toString("ascii", offset, offset + 4);
      if (type === "fmt ") format = wav.subarray(offset + 8, offset + 8 + size);
      if (type === "data") data = wav.subarray(offset + 8, offset + 8 + size);
      offset += 8 + size + (size % 2);
    }
    const channels = format && format.length >= 16 ? format.readUInt16LE(2) : 0;
    const sourceRate = format && format.length >= 16 ? format.readUInt32LE(4) : 0;
    if (
      !format ||
      !data ||
      format.length < 16 ||
      format.readUInt16LE(0) !== 1 ||
      format.readUInt16LE(14) !== 16 ||
      ![1, 2].includes(channels) ||
      sourceRate < 8000 ||
      sourceRate > 96000 ||
      !data.length ||
      data.length % (channels * 2)
    ) {
      throw new AppError(
        "The recording format could not be prepared. Please regenerate the voice.",
        502,
      );
    }
    const frames = data.length / (channels * 2);
    const duration = frames / sourceRate;
    const maxBytes = 3 * 1024 * 1024;
    const rate = Math.min(sourceRate, 16000, Math.floor(maxBytes / (duration * 2)));
    if (rate < 8000)
      throw new AppError(
        "The recording was too long. Please regenerate a shorter explanation.",
        502,
      );
    const count = Math.floor((frames * rate) / sourceRate);
    const result = Buffer.alloc(44 + count * 2);
    result.write("RIFF", 0);
    result.writeUInt32LE(result.length - 8, 4);
    result.write("WAVEfmt ", 8);
    result.writeUInt32LE(16, 16);
    result.writeUInt16LE(1, 20);
    result.writeUInt16LE(1, 22);
    result.writeUInt32LE(rate, 24);
    result.writeUInt32LE(rate * 2, 28);
    result.writeUInt16LE(2, 32);
    result.writeUInt16LE(16, 34);
    result.write("data", 36);
    result.writeUInt32LE(count * 2, 40);
    for (let index = 0; index < count; index++) {
      const first = Math.floor((index * sourceRate) / rate);
      const last = Math.min(frames, Math.floor(((index + 1) * sourceRate) / rate));
      let sum = 0;
      for (let frame = first; frame < last; frame++) {
        for (let channel = 0; channel < channels; channel++)
          sum += data.readInt16LE((frame * channels + channel) * 2);
      }
      result.writeInt16LE(Math.round(sum / ((last - first) * channels)), 44 + index * 2);
    }
    return result;
  }
}
