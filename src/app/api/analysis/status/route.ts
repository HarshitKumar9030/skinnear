import { NextRequest, NextResponse } from "next/server";
import { YouCamService, YouCamTaskError } from "@/services/YouCamService";
import { errorResponse, AppError } from "@/lib/errors";
import { limitRequest } from "@/lib/rate-limit";
import { boundedJson } from "@/lib/request-body";
import { TaskTokenService } from "@/services/TaskTokenService";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const { userId, protection } = await limitRequest(request.headers, "status", 12);
    const body = z.object({ token: z.string().min(1).max(2048) }).parse(await boundedJson(request, 4096));
    const scan = new TaskTokenService().read(body.token, userId);
    try {
      const result = await new YouCamService().status(body.token, userId);
      if (result.status === "success" && scan.lease) await protection.releaseScan(userId, scan.lease);
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if ((error instanceof YouCamTaskError || (error instanceof AppError && error.status === 422)) && scan.lease) await protection.releaseScan(userId, scan.lease);
      throw error;
    }
  } catch (error) { return errorResponse(error); }
}
