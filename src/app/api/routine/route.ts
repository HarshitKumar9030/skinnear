import { NextRequest, NextResponse } from "next/server";
import { routineRequestSchema } from "@/domain/schemas";
import { RecommendationService } from "@/services/RecommendationService";
import { ProductRepository } from "@/repositories/ProductRepository";
import { errorResponse } from "@/lib/errors";
import { limitRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    limitRequest(request.headers, "routine", 30);
    const input = routineRequestSchema.parse(await request.json());
    const catalog = await new ProductRepository().getCatalog();
    return NextResponse.json(new RecommendationService(catalog.products).build(input, catalog.source));
  } catch (error) { return errorResponse(error); }
}
