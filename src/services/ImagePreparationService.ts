import sharp from "sharp";
import { AppError } from "@/lib/errors";
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/** Decode before upload, correct phone rotation, strip metadata and constrain dimensions. */
export class ImagePreparationService {
  async prepare(file: File): Promise<File> {
    if (!["image/jpeg", "image/png"].includes(file.type) || !file.size) throw new AppError("Choose a valid JPEG or PNG photo.", 400);
    if (file.size > MAX_PHOTO_BYTES) throw new AppError("Choose a photo smaller than 8 MB.", 413);
    try {
      const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40000000, failOn: "error" });
      const metadata = await image.metadata();
      if (!["jpeg", "png"].includes(metadata.format || "") || (metadata.pages || 1) > 1 || !metadata.width || !metadata.height) throw new AppError("Choose a single JPEG or PNG photo.", 400);
      const swapsAxes = (metadata.orientation || 1) >= 5;
      const width = swapsAxes ? metadata.height : metadata.width;
      const height = swapsAxes ? metadata.width : metadata.height;
      const scale = Math.min(2560 / Math.max(width, height), Math.max(1, 480 / Math.min(width, height)));
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));
      // Small photos upscale proportionally. Unusually narrow photos get padding
      // rather than distortion or a crop that could remove part of the face.
      const horizontalPadding = Math.max(0, 480 - targetWidth);
      const verticalPadding = Math.max(0, 480 - targetHeight);
      const data = await image.rotate().resize(targetWidth, targetHeight, { fit: "fill" }).flatten({ background: "#ffffff" })
        .extend({ left: Math.floor(horizontalPadding / 2), right: Math.ceil(horizontalPadding / 2), top: Math.floor(verticalPadding / 2), bottom: Math.ceil(verticalPadding / 2), background: "#ffffff" })
        .jpeg({ quality: 90 }).toBuffer();
      return new File([new Uint8Array(data)], "selfie.jpg", { type: "image/jpeg" });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("This photo could not be decoded. Choose a valid JPEG or PNG.", 400);
    }
  }
}
