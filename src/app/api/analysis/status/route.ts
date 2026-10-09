import { NextRequest, NextResponse } from "next/server";
import { YouCamService } from "@/services/YouCamService";
import { errorResponse, AppError } from "@/lib/errors";
import { limitRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    limitRequest(request.headers, "status", 60);
    const body = await request.json();
    if (typeof body.token !== "string") throw new AppError("The scan session is missing.", 400);
    return NextResponse.json(await new YouCamService().status(body.token));
  } catch (error) { return errorResponse(error); }
}
