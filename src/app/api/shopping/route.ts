import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { preferencesSchema } from "@/domain/schemas";
import { ShoppingService } from "@/services/ShoppingService";
import { ProductRepository } from "@/repositories/ProductRepository";
import { errorResponse, AppError } from "@/lib/errors";
import { limitRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    limitRequest(request.headers, "shopping", 8);
    const input = z.object({ productId: z.string(), city: preferencesSchema.shape.city }).parse(await request.json());
    const catalog = await new ProductRepository().getCatalog();
    const product = catalog.products.find((p) => p.id === input.productId);
    if (!product) throw new AppError("Product not found.", 404);
    return NextResponse.json({ listings: await new ShoppingService().search(product, input.city) });
  } catch (error) { return errorResponse(error); }
}
