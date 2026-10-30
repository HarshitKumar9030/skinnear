export type CameraFacing = "user" | "environment";

/** Owns one camera stream. Late permission responses cannot reopen a closed session. */
export class CameraCaptureService {
  private stream: MediaStream | null = null;
  private generation = 0;
  private deviceId: string | undefined;
  private facingMode: string | undefined;
  private requestedFacing: CameraFacing | undefined;

  constructor(private readonly devices: Pick<MediaDevices, "getUserMedia" | "enumerateDevices">) {}

  async open(facing: CameraFacing): Promise<MediaStream | null> {
    this.stop();
    const generation = this.generation;
    let alternateId: string | undefined;
    if (this.deviceId && !this.facingMode && this.requestedFacing !== facing) {
      // Desktop/virtual cameras may expose IDs but no front/rear metadata.
      try {
        alternateId = (await this.devices.enumerateDevices()).find(
          (device) => device.kind === "videoinput" && device.deviceId !== this.deviceId,
        )?.deviceId;
      } catch {
        /* Facing-mode selection still works when enumeration is unavailable. */
      }
      if (generation !== this.generation) return null;
    }
    const stream = await this.devices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: facing },
        ...(alternateId ? { deviceId: { exact: alternateId } } : {}),
        width: { ideal: 1280 },
        height: { ideal: 1280 },
      },
    });
    if (generation !== this.generation) {
      stream.getTracks().forEach((track) => track.stop());
      return null;
    }
    this.stream = stream;
    const settings = stream.getVideoTracks()[0]?.getSettings?.();
    this.deviceId = settings?.deviceId;
    this.facingMode = settings?.facingMode;
    this.requestedFacing = facing;
    return stream;
  }

  async hasMultipleCameras(): Promise<boolean> {
    try {
      return (
        (await this.devices.enumerateDevices()).filter((device) => device.kind === "videoinput")
          .length > 1
      );
    } catch {
      return false;
    }
  }

  stop() {
    this.generation++;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  async capture(video: HTMLVideoElement): Promise<File> {
    if (
      !this.stream?.getVideoTracks().some((track) => track.readyState === "live") ||
      video.readyState < 2
    )
      throw new Error("The camera paused. Reopen it and try again.");
    const generation = this.generation;
    const side = Math.min(video.videoWidth, video.videoHeight);
    if (side < 480)
      throw new Error("This camera's resolution is too low. Upload a clearer photo instead.");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(side, 1280);
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("This browser could not capture a photo. Try uploading one instead.");
    // Match the square viewfinder; capture stays unmirrored for the analysis provider.
    context.drawImage(
      video,
      (video.videoWidth - side) / 2,
      (video.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (generation !== this.generation) throw new DOMException("Capture cancelled", "AbortError");
    if (!blob) throw new Error("The photo could not be captured. Please try again.");
    return new File([blob], "camera-selfie.jpg", { type: "image/jpeg" });
  }
}

export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera access is blocked. Allow it in your browser settings, or upload a selfie below.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No suitable camera was found. You can upload a selfie instead.";
  if (name === "NotReadableError")
    return "Your camera may be in use by another app. Close it there and retry, or upload a selfie.";
  return error instanceof Error
    ? error.message
    : "The camera could not open. Try uploading a selfie instead.";
}
