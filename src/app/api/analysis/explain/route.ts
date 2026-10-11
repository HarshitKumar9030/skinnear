import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { boundedJson } from "@/lib/request-body";
import { limitRequest } from "@/lib/rate-limit";
import { errorResponse } from "@/lib/errors";
import { SkinExplanationService, skinExplanationInput } from "@/services/SkinExplanationService";

const inputSchema = z.object({ analysis: skinExplanationInput, consent: z.literal(true) }).strict();

export async function POST(request: NextRequest) {
  try {
    const session = await limitRequest(request.headers, "skin-explanation", 4);
    const input = inputSchema.parse(await boundedJson(request, 4000));
    await session.protection.reserveAi(request.headers, session.userId);
    const explanation = await new SkinExplanationService().explain(input.analysis, session.userId);
    return NextResponse.json(explanation, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
