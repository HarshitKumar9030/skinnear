import { NextRequest, NextResponse } from "next/server";
import { routineRequestSchema } from "@/domain/schemas";
import { RoutineService } from "@/services/RoutineService";
import { errorResponse } from "@/lib/errors";
import { limitRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    limitRequest(request.headers, "routine", 30);
    const input = routineRequestSchema.parse(await request.json());
    return NextResponse.json(await new RoutineService().build(input));
  } catch (error) { return errorResponse(error); }
}
