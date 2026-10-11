import { boundedJson } from "@/lib/request-body";
import { NextRequest, NextResponse } from "next/server";
import { routineRequestSchema } from "@/domain/schemas";
import { RoutineService } from "@/services/RoutineService";
import { errorResponse } from "@/lib/errors";
import { limitRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await limitRequest(request.headers, "routine", 30);
    const input = routineRequestSchema.parse(await boundedJson(request));
    return NextResponse.json(await new RoutineService().build(input));
  } catch (error) {
    return errorResponse(error);
  }
}
