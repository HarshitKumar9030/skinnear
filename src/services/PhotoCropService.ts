import { cropGeometry, type CropSettings } from "@/domain/photo-crop";

/** Decodes once, edits locally and always renders from the original source pixels. */
export class PhotoCropService {
  private closed = false;
  readonly width: number;
  readonly height: number;
  private constructor(private readonly image: ImageBitmap) {
    this.width = image.width;
    this.height = image.height;
  }

  static async open(file: File): Promise<PhotoCropService> {
    if (!file.size || file.size > 8 * 1024 * 1024)
      throw new Error("Choose a photo smaller than 8 MB.");
    let image: ImageBitmap;
    try {
      image = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      throw new Error("This photo could not be opened. Try another JPEG or PNG.");
    }
    if (image.width * image.height > 40_000_000) {
      image.close();
      throw new Error("This photo is too large to crop here. Choose a smaller copy.");
    }
    return new PhotoCropService(image);
  }

  draw(context: CanvasRenderingContext2D, settings: CropSettings, outputSize: number) {
    if (this.closed) return;
    const crop = cropGeometry(this.width, this.height, settings);
    context.clearRect(0, 0, outputSize, outputSize);
    context.fillStyle = "white";
    context.fillRect(0, 0, outputSize, outputSize);
    context.save();
    context.scale(outputSize / crop.side, outputSize / crop.side);
    context.translate(-crop.left, -crop.top);
    context.translate(crop.rotatedWidth / 2, crop.rotatedHeight / 2);
    context.rotate((crop.turns * Math.PI) / 2);
    context.drawImage(this.image, -this.width / 2, -this.height / 2);
    context.restore();
  }

  async export(settings: CropSettings): Promise<File> {
    if (this.closed) throw new Error("This photo changed. Reopen the crop editor and try again.");
    const crop = cropGeometry(this.width, this.height, settings);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(1600, Math.max(480, Math.round(crop.side)));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("This browser could not crop the photo. Try another browser or photo.");
    this.draw(context, settings, canvas.width);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob || blob.size > 3 * 1024 * 1024)
      throw new Error("This crop could not be prepared. Try a smaller photo.");
    return new File([blob], "skin-crop.jpg", { type: "image/jpeg" });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.image.close();
  }
}
