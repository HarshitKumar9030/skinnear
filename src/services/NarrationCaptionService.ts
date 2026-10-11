import type { NarrationCue, SpokenWord } from "@/domain/narration";

const normalize = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Matches speech timestamps to approved words; ASR text is never shown as advice. */
export class NarrationCaptionService {
  duration(wav: Buffer): number {
    let bytesPerSecond = 0;
    let dataBytes = 0;
    for (let offset = 12; offset + 8 <= wav.length;) {
      const type = wav.toString("ascii", offset, offset + 4);
      const size = wav.readUInt32LE(offset + 4);
      if (offset + 8 + size > wav.length) break;
      if (type === "fmt " && size >= 16) bytesPerSecond = wav.readUInt32LE(offset + 16);
      if (type === "data") dataBytes = size;
      offset += 8 + size + (size % 2);
    }
    return bytesPerSecond ? dataBytes / bytesPerSecond : 0;
  }

  estimate(text: string, duration: number): NarrationCue[] {
    const tokens = text.match(/\S+/g) ?? [];
    const total = tokens.reduce((sum, word) => sum + word.length, 0);
    let elapsed = 0;
    const words = tokens.map((word) => {
      const start = elapsed;
      elapsed += total ? (word.length / total) * duration : 0;
      return { text: word, start, end: elapsed };
    });
    return this.group(words);
  }

  align(text: string, spoken: SpokenWord[], duration: number): NarrationCue[] {
    const tokens = text.match(/\S+/g) ?? [];
    if (
      !tokens.length ||
      tokens.length > 1200 ||
      !spoken.length ||
      spoken.length > 1600 ||
      !duration
    )
      return [];
    if (
      spoken.some(
        (word, index) =>
          !Number.isFinite(word.start) ||
          !Number.isFinite(word.end) ||
          word.start < 0 ||
          word.end < word.start ||
          word.end > duration + 1 ||
          (index > 0 && word.start < spoken[index - 1].start),
      )
    )
      return [];

    const width = spoken.length + 1;
    const costs = new Uint16Array((tokens.length + 1) * width);
    for (let i = 0; i <= tokens.length; i++) costs[i * width] = i;
    for (let j = 0; j <= spoken.length; j++) costs[j] = j;
    const expected = tokens.map(normalize);
    const observed = spoken.map((word) => normalize(word.text));
    for (let i = 1; i <= tokens.length; i++) {
      for (let j = 1; j <= spoken.length; j++) {
        costs[i * width + j] = Math.min(
          costs[(i - 1) * width + j] + 1,
          costs[i * width + j - 1] + 1,
          costs[(i - 1) * width + j - 1] + (expected[i - 1] === observed[j - 1] ? 0 : 1),
        );
      }
    }
    if (costs[tokens.length * width + spoken.length] / Math.max(tokens.length, spoken.length) > 0.4)
      return [];

    const aligned: (SpokenWord | undefined)[] = Array(tokens.length);
    let i = tokens.length;
    let j = spoken.length;
    while (i > 0 && j > 0) {
      const current = costs[i * width + j];
      const substitution = expected[i - 1] === observed[j - 1] ? 0 : 1;
      if (current === costs[(i - 1) * width + j - 1] + substitution) {
        aligned[i - 1] = { ...spoken[j - 1], text: tokens[i - 1] };
        i--;
        j--;
      } else if (current === costs[(i - 1) * width + j] + 1) i--;
      else j--;
    }
    // Interpolate only omitted approved words between actual speech anchors.
    for (let index = 0; index < aligned.length;) {
      if (aligned[index]) {
        index++;
        continue;
      }
      const first = index;
      while (index < aligned.length && !aligned[index]) index++;
      const start = first ? aligned[first - 1]!.end : 0;
      const end = Math.max(start, aligned[index]?.start ?? duration);
      const interval = (end - start) / (index - first);
      for (let missing = first; missing < index; missing++) {
        aligned[missing] = {
          text: tokens[missing],
          start: start + (missing - first) * interval,
          end: start + (missing - first + 1) * interval,
        };
      }
    }
    return this.group(aligned as SpokenWord[]);
  }

  private group(words: SpokenWord[]): NarrationCue[] {
    const cues: NarrationCue[] = [];
    let line: SpokenWord[] = [];
    for (let index = 0; index < words.length; index++) {
      line.push(words[index]);
      if (line.length >= 18 || /[.!?]$/.test(words[index].text) || index === words.length - 1) {
        cues.push({
          text: line.map((word) => word.text).join(" "),
          start: line[0].start,
          end: line[line.length - 1].end,
        });
        line = [];
      }
    }
    return cues;
  }
}
