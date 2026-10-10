import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CURRENCIES } from "@/domain/regions";
import { ProductRepository } from "@/repositories/ProductRepository";
import { CurrencyService } from "@/services/CurrencyService";
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
    const [catalog, quote] = await Promise.all([
      new ProductRepository().getCatalog(),
      new CurrencyService().quote(currency),
    ]);
    return NextResponse.json(
      {
        currency,
        products: catalog.products.map((product) => ({
          ...product,
          referencePrice:
            Math.ceil(product.referencePrice * quote.rate * 100) / 100,
        })),
        source: catalog.source,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
