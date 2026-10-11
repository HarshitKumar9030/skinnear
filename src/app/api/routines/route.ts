import { boundedJson } from "@/lib/request-body";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { routineRequestSchema } from "@/domain/schemas";
import { RoutineRepository } from "@/repositories/RoutineRepository";
import { RoutineService } from "@/services/RoutineService";
import { errorResponse, AppError } from "@/lib/errors";
import { limitRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await limitRequest(request.headers, "save", 5);
    const input = routineRequestSchema.parse(await boundedJson(request));
    const routine = await new RoutineService().build(input);
    if (!routine.feasible) throw new AppError("Build a complete routine before saving.", 400);
    const ownerId = request.cookies.get("skinnear-owner")?.value || randomUUID();
    const id = await new RoutineRepository().save(ownerId, input, routine);
    const response = NextResponse.json({ id }, { status: 201 });
    response.cookies.set("skinnear-owner", ownerId, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 86400,
      path: "/",
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
