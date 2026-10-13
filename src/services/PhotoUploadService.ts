/** Reduces large photos locally before a request reaches Vercel's body limit. */
export class PhotoUploadService {
  async prepare(file: File): Promise<File> {
    if (file.size <= 3 * 1024 * 1024) return file;
    const image = await createImageBitmap(file);
    try {
      if (image.width * image.height > 40_000_000)
        throw new Error("This photo is too large to process. Choose a smaller copy.");
      const scale = Math.min(1, 2048 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Your browser could not prepare this photo. Try a smaller copy.");
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.88),
      );
      if (!blob || blob.size > 3 * 1024 * 1024)
        throw new Error("This photo could not be reduced for upload. Choose a smaller copy.");
      return new File([blob], "skin-photo.jpg", { type: "image/jpeg" });
    } finally {
      image.close();
    }
  }
}
