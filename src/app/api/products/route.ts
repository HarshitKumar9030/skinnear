import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CURRENCIES } from "@/domain/regions";
import { ProductRepository } from "@/repositories/ProductRepository";
import { MarketCatalogService } from "@/services/MarketCatalogService";
import { preferencesSchema } from "@/domain/schemas";
import { limitRequest } from "@/lib/rate-limit";
import { errorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    await limitRequest(request.headers, "catalog", 30);
    const currency = z
      .string()
      .max(4)
      .refine((value) => CURRENCIES.includes(value))
      .parse(request.nextUrl.searchParams.get("currency") || "INR");
    const country = preferencesSchema.shape.country
      .optional()
      .parse(request.nextUrl.searchParams.get("country") || undefined);
    const catalog = await new ProductRepository().getCatalog();
    const priced = await new MarketCatalogService().price(
      catalog.products,
      currency,
      country,
    );
    return NextResponse.json(
      {
        currency,
        products: priced.products,
        source: catalog.source,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
