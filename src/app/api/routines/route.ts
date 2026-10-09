import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { routineRequestSchema } from "@/domain/schemas";
import { RoutineRepository } from "@/repositories/RoutineRepository";
import { ProductRepository } from "@/repositories/ProductRepository";
import { RecommendationService } from "@/services/RecommendationService";
import { errorResponse, AppError } from "@/lib/errors";
import { limitRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    limitRequest(request.headers, "save", 5);
    const input = routineRequestSchema.parse(await request.json());
    const catalog = await new ProductRepository().getCatalog();
    const routine = new RecommendationService(catalog.products).build(input, catalog.source);
    if (!routine.feasible) throw new AppError("Build a complete routine before saving.", 400);
    const ownerId = request.cookies.get("skinnear-owner")?.value || randomUUID();
    const id = await new RoutineRepository().save(ownerId, input, routine);
    const response = NextResponse.json({ id }, { status: 201 });
    response.cookies.set("skinnear-owner", ownerId, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 30 * 86400, path: "/" });
    return response;
  } catch (error) { return errorResponse(error); }
}
