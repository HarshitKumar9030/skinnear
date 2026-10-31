export const PHOTO_ISSUES = [
  "face-too-small",
  "multiple-faces",
  "no-face",
  "face-angle",
  "unreadable-photo",
  "face-out-of-frame",
  "low-light",
] as const;
export type PhotoIssue = (typeof PHOTO_ISSUES)[number];
export function isPhotoIssue(value: unknown): value is PhotoIssue {
  return typeof value === "string" && PHOTO_ISSUES.some((issue) => issue === value);
}
export function providerPhotoIssue(error: string | null | undefined): PhotoIssue | undefined {
  const issues = new Map<string, PhotoIssue>([
    ["error_src_face_too_small", "face-too-small"],
    ["error_multiple_people", "multiple-faces"],
    ["error_no_face", "no-face"],
    ["error_large_face_angle", "face-angle"],
    ["error_decode_image", "unreadable-photo"],
    ["error_src_face_out_of_bound", "face-out-of-frame"],
    ["error_lighting_dark", "low-light"],
  ]);
  return issues.get(error ?? "");
}
export const PHOTO_ISSUE_HELP: Record<PhotoIssue, { title: string; detail: string }> = {
  "face-out-of-frame": {
    title: "Give your whole face some room.",
    detail:
      "Reset or loosen the crop so your forehead, chin and both cheeks are inside the frame. Retake if any part is missing from the original.",
  },
  "low-light": {
    title: "A little more light will help.",
    detail:
      "Face a soft, even light source and retake the photo. Cropping cannot recover detail hidden in deep shadows.",
  },
  "face-too-small": {
    title: "Bring your face into focus.",
    detail:
      "Crop closer so your face fills most of the frame. Keep your forehead, chin and both cheeks visible.",
  },
  "multiple-faces": {
    title: "Give one face the frame.",
    detail: "Crop out other people completely, or take a new solo selfie.",
  },
  "no-face": {
    title: "Your face needs a clearer view.",
    detail:
      "If your face is distant, try a closer crop. Otherwise, choose a brighter, front-facing photo.",
  },
  "face-angle": {
    title: "A fresh, front-facing photo will help.",
    detail:
      "Cropping cannot fix a tilted or side-on face. Face the camera directly and retake your photo.",
  },
  "unreadable-photo": {
    title: "Let's use a fresh photo.",
    detail: "This image could not be read. Choose another JPEG or PNG, or take a new selfie.",
  },
};
