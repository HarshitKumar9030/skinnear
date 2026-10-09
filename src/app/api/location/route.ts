import { NextRequest, NextResponse } from "next/server";
import { LocationService } from "@/services/LocationService";
import { errorResponse } from "@/lib/errors";
import { limitRequest } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    limitRequest(request.headers, "location", 5);
    return NextResponse.json(await new LocationService().suggest(request.headers));
  } catch (error) { return errorResponse(error); }
}
