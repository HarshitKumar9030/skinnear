import { NextRequest, NextResponse } from "next/server";
import { ImagePreparationService, MAX_PHOTO_BYTES } from "@/services/ImagePreparationService";
import { boundedBody } from "@/lib/request-body";
import { YouCamService } from "@/services/YouCamService";
import { AppError, errorResponse } from "@/lib/errors";
import { limitRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const { userId, protection } = await limitRequest(request.headers, "analysis", 3);
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
      throw new AppError("Upload the photo using the SkinNear form.", 415);
    const bytes = await boundedBody(request, MAX_PHOTO_BYTES + 65536);
    let form: FormData;
    try {
      form = await new Response(bytes, {
        headers: { "Content-Type": request.headers.get("content-type")! },
      }).formData();
    } catch {
      throw new AppError("This upload could not be read. Please select your photo again.", 400);
    }
    if (form.get("consent") !== "true")
      throw new AppError("Please consent to photo processing before starting.", 400);
    const file = form.get("photo");
    if (!(file instanceof File) || form.getAll("photo").length !== 1)
      throw new AppError("Choose one JPEG or PNG photo.", 400);
    const prepared = await new ImagePreparationService().prepare(file);
    const lease = await protection.reserveScan(request.headers, userId);
    try {
      return NextResponse.json(
        { token: await new YouCamService().start(prepared, userId, lease) },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      await protection.releaseScan(userId, lease);
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}

export const maxDuration = 120;
