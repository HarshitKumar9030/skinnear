import { boundedJson } from "@/lib/request-body";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { preferencesSchema } from "@/domain/schemas";
import { ShoppingService } from "@/services/ShoppingService";
import { ProductRepository } from "@/repositories/ProductRepository";
import { errorResponse, AppError } from "@/lib/errors";
import { limitRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await limitRequest(request.headers, "shopping", 8);
    const input = z
      .object({
        productId: z.string(),
        city: preferencesSchema.shape.city,
        country: preferencesSchema.shape.country,
        retailer: z.enum(["blinkit", "zepto"]).optional(),
      })
      .parse(await boundedJson(request));
    if (input.retailer && input.country !== "IN")
      throw new AppError("Blinkit and Zepto lookups are available for India only.", 400);
    const catalog = await new ProductRepository().getCatalog();
    const product = catalog.products.find((p) => p.id === input.productId);
    if (!product) throw new AppError("Product not found.", 404);
    return NextResponse.json(
      await new ShoppingService().lookup(product, input.city, input.country, input.retailer),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
