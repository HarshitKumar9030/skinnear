import { NextRequest } from "next/server";
import { z } from "zod";
import { boundedJson } from "@/lib/request-body";
import { limitRequest } from "@/lib/rate-limit";
import { errorResponse } from "@/lib/errors";
import { NarrationTokenService } from "@/services/NarrationTokenService";
import { GeminiClient } from "@/services/GeminiClient";
import { NarrationCaptionService } from "@/services/NarrationCaptionService";
const inputSchema = z
  .object({
    token: z.string().max(12000),
    consent: z.literal(true),
    captions: z.boolean().default(false),
  })
  .strict();
export async function POST(request: NextRequest) {
  try {
    const session = await limitRequest(request.headers, "ai-voice", 3);
    const input = inputSchema.parse(await boundedJson(request, 16000));
    const text = new NarrationTokenService().verify(input.token, session.userId);
    await session.protection.reserveAi(request.headers, session.userId);
    const gemini = new GeminiClient();
    const audio = await gemini.speech(text);
    if (input.captions) {
      const captions = new NarrationCaptionService();
      const duration = captions.duration(audio);
      let cues = captions.estimate(text, duration);
      let timing: "aligned" | "estimated" = "estimated";
      try {
        await session.protection.reserveAi(request.headers, session.userId);
        const aligned = captions.align(text, await gemini.timestamps(audio), duration);
        if (aligned.length) {
          cues = aligned;
          timing = "aligned";
        }
      } catch {
        /* Caption failure never discards successfully generated audio. */
      }
      return Response.json(
        { audio: audio.toString("base64"), mimeType: "audio/wav", cues, timing },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return new Response(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
