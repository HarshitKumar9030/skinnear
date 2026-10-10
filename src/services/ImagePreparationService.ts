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
      if (!["jpeg", "png"].includes(metadata.format || "") || (metadata.pages || 1) > 1 || Math.min(metadata.width || 0, metadata.height || 0) < 480) throw new AppError("Use a single JPEG or PNG at least 480 pixels on each side.", 400);
      const { data, info } = await image.rotate().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
      if (Math.min(info.width, info.height) < 480) throw new AppError("Choose a portrait photo with your face clearly visible; this image is too narrow.", 400);
      return new File([new Uint8Array(data)], "selfie.jpg", { type: "image/jpeg" });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("This photo could not be decoded. Choose a valid JPEG or PNG.", 400);
    }
  }
}
