import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { boundedJson } from "@/lib/request-body";
import { limitRequest } from "@/lib/rate-limit";
import { errorResponse } from "@/lib/errors";
import { ProductRepository } from "@/repositories/ProductRepository";
import { PortableRoutineService } from "@/services/PortableRoutineService";
import { RoutineExplanationService } from "@/services/RoutineExplanationService";
const inputSchema = z.object({ plan: z.string().max(16000), consent: z.literal(true) }).strict();
export async function POST(request: NextRequest) {
  try {
    const session = await limitRequest(request.headers, "ai-explanation", 4);
    const input = inputSchema.parse(await boundedJson(request, 20000));
    const catalog = await new ProductRepository().getCatalog();
    const snapshot = new PortableRoutineService().decode(input.plan, catalog.products);
    await session.protection.reserveAi(request.headers, session.userId);
    return NextResponse.json(
      await new RoutineExplanationService().explain(snapshot, catalog.products, session.userId),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export const maxDuration = 60;
export const runtime = "nodejs";
