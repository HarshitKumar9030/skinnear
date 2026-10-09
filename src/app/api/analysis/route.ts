import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { YouCamService } from "@/services/YouCamService";
import { AppError, errorResponse } from "@/lib/errors";
import { limitRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    limitRequest(request.headers, "analysis", 5);
    if (Number(request.headers.get("content-length")) > 5 * 1024 * 1024) throw new AppError("Choose a photo smaller than 4 MB.", 413);
    const form = await request.formData();
    if (form.get("consent") !== "true") throw new AppError("Please consent to photo processing before starting.", 400);
    const file = form.get("photo");
    if (!(file instanceof File) || !["image/jpeg", "image/png"].includes(file.type)) throw new AppError("Choose a JPEG or PNG photo.", 400);
    if (!file.size || file.size > 4 * 1024 * 1024) throw new AppError("Choose a photo smaller than 4 MB.", 413);
    let metadata;
    try { metadata = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40000000 }).metadata(); }
    catch { throw new AppError("This photo could not be read. Choose a valid JPEG or PNG.", 400); }
    if (!["jpeg", "png"].includes(metadata.format || "") || Math.min(metadata.width || 0, metadata.height || 0) < 480) throw new AppError("Use a JPEG or PNG at least 480 pixels on each side.", 400);
    return NextResponse.json({ token: await new YouCamService().start(file) }, { status: 202 });
  } catch (error) { return errorResponse(error); }
}
