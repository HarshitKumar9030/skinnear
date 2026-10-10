import { NextRequest } from "next/server";
import { z } from "zod";
import { boundedJson } from "@/lib/request-body";
import { limitRequest } from "@/lib/rate-limit";
import { errorResponse } from "@/lib/errors";
import { NarrationTokenService } from "@/services/NarrationTokenService";
import { GeminiClient } from "@/services/GeminiClient";
const inputSchema = z.object({token:z.string().max(12000),consent:z.literal(true)}).strict();
export async function POST(request: NextRequest) {
  try {
    const session = await limitRequest(request.headers,"ai-voice",3);
    const input = inputSchema.parse(await boundedJson(request,16000));
    const text = new NarrationTokenService().verify(input.token,session.userId);
    await session.protection.reserveAi(request.headers,session.userId);
    const audio = await new GeminiClient().speech(text);
    return new Response(new Uint8Array(audio),{headers:{"Content-Type":"audio/wav","Cache-Control":"no-store","Content-Disposition":"inline"}});
  } catch (error) { return errorResponse(error); }
}
