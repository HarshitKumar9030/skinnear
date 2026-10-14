import { NextRequest } from "next/server";
import { routineRequestSchema } from "@/domain/schemas";
import { boundedJson } from "@/lib/request-body";
import { errorResponse } from "@/lib/errors";
import { limitRequest } from "@/lib/rate-limit";
import { RoutineService } from "@/services/RoutineService";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await limitRequest(request.headers, "budget-comparison", 6);
    const input = routineRequestSchema.parse(await boundedJson(request));
    return Response.json(await new RoutineService().compare(input), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
