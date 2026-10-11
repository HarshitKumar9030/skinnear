import { z } from "zod";
import { AppError } from "@/lib/errors";
import { boundedJson } from "@/lib/request-body";
import type { SpokenWord } from "@/domain/narration";

const responseSchema = z.object({
  status: z.string().optional(),
  steps: z
    .array(
      z.object({
        type: z.string(),
        content: z
          .array(
            z.object({
              type: z.string(),
              text: z.string().optional(),
              data: z.string().optional(),
              mime_type: z.string().optional(),
              annotations: z
                .array(
                  z.object({
                    type: z.string(),
                    text: z.string().optional(),
                    start_offset: z.string().optional(),
                    end_offset: z.string().optional(),
                  }),
                )
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .default([]),
});

/** Server-only REST boundary. No provider response or key is exposed in errors. */
export class GeminiClient {
  async timestamps(wav: Buffer): Promise<SpokenWord[]> {
    const parts = await this.interact(
      {
        model: process.env.GEMINI_TRANSCRIBE_MODEL || "gemini-3.5-transcribe",
        input: [{ type: "audio", data: wav.toString("base64"), mime_type: "audio/wav" }],
        generation_config: {
          transcription_config: { mode: { type: "verbatim", timestamp_granularities: ["word"] } },
        },
      },
      30000,
    );
    const seconds = (offset: string | undefined) =>
      offset && /^\d+(?:\.\d+)?s$/.test(offset) ? Number(offset.slice(0, -1)) : NaN;
    return parts
      .flatMap((part) => part.annotations ?? [])
      .filter((annotation) => annotation.type === "word_info" && annotation.text)
      .map((annotation) => ({
        text: annotation.text!,
        start: seconds(annotation.start_offset),
        end: seconds(annotation.end_offset),
      }));
  }
  async interact(body: Record<string, unknown>, timeout = 30000) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new AppError("Gemini explanations are not configured yet.", 503);
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({ ...body, store: false }),
          signal: AbortSignal.timeout(timeout),
        },
      );
      if (!response.ok)
        throw new AppError(
          response.status === 429
            ? "Gemini is busy or its quota is reached. Please try again later."
            : "Gemini could not complete this request. Please retry.",
          response.status === 429 ? 429 : 502,
        );
      const result = responseSchema.parse(await boundedJson(response, 12 * 1024 * 1024));
      if (result.status && result.status !== "completed")
        throw new AppError("Gemini did not finish this request. Please retry.", 502);
      return result.steps
        .filter((step) => step.type === "model_output")
        .flatMap((step) => step.content ?? []);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Gemini is temporarily unavailable. Please retry.", 502);
    }
  }
  async text(prompt: string, system: string) {
    const parts = await this.interact({
      model: process.env.GEMINI_TEXT_MODEL || "gemini-3.8-flash",
      input: prompt,
      system_instruction: system,
      generation_config: { temperature: 0.2, max_output_tokens: 3000, thinking_level: "low" },
    });
    const text = parts
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("\n");
    if (!text || text.length > 12000)
      throw new AppError("The explanation was incomplete. Please retry.", 502);
    return text;
  }
  async speech(text: string) {
    const parts = await this.interact(
      {
        model: process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts",
        input: [
          {
            type: "user_input",
            content: [
              {
                type: "text",
                text,
                annotations: [
                  {
                    type: "speech_metadata",
                    style:
                      "Warm, calm and conversational. Clearly explain skincare at an easy pace. Read the exact transcript; do not add advice.",
                  },
                ],
              },
            ],
          },
        ],
        response_format: { type: "audio", mime_type: "audio/wav" },
        generation_config: { speech_config: [{ voice: "Sulafat" }] },
      },
      60000,
    );
    const part = parts.findLast((part) => part.type === "audio" && part.data);
    const wav = Buffer.from(part?.data ?? "", "base64");
    if (
      wav.length < 44 ||
      wav.length > 8 * 1024 * 1024 ||
      wav.toString("ascii", 0, 4) !== "RIFF" ||
      wav.toString("ascii", 8, 12) !== "WAVE"
    )
      throw new AppError("Voice generation was incomplete. Please retry.", 502);
    return wav;
  }
}
