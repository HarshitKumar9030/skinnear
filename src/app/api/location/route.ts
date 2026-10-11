import { boundedJson } from "@/lib/request-body";
import { NextRequest, NextResponse } from "next/server";
import { LocationService } from "@/services/LocationService";
import { errorResponse } from "@/lib/errors";
import { limitRequest } from "@/lib/rate-limit";
import { z } from "zod";
import { publicIpSchema } from "@/domain/location";

export async function GET(request: NextRequest) {
  try {
    await limitRequest(request.headers, "location", 5);
    return NextResponse.json(await new LocationService().suggest(request.headers));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await limitRequest(request.headers, "location-resolve", 5);
    const { ip } = z.object({ ip: publicIpSchema }).parse(await boundedJson(request));
    return NextResponse.json(await new LocationService().resolve(ip));
  } catch (error) {
    return errorResponse(error);
  }
}
