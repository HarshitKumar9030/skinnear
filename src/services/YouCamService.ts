import { z } from "zod";
import { scoreSchema, type SkinAnalysis } from "@/domain/schemas";
import { AppError } from "@/lib/errors";
import { safeHttpsUrl } from "@/lib/http";
import { TaskTokenService } from "./TaskTokenService";
import { YouCamClient } from "./YouCamClient";

const uploadSchema = z.object({
  files: z
    .array(
      z.object({
        file_id: z.string().min(1),
        requests: z
          .array(
            z.object({
              method: z.literal("PUT"),
              url: z.url(),
              headers: z.record(z.string(), z.string()),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});
const taskSchema = z.object({ task_id: z.string().min(1) });
// Results are heterogeneous: skin_age, all and resize_image have no ui_score.
// Inspect them only after completion; running/error responses need no results.
const statusSchema = z.object({
  task_status: z.enum(["queued", "pending", "running", "success", "error"]),
  error: z.string().nullable().optional(),
  results: z.unknown().optional(),
});
const resultsSchema = z.object({ output: z.array(z.unknown()) });
const outputSchema = z.object({
  type: z.string(),
  ui_score: z.unknown().optional(),
  mask_urls: z.unknown().optional(),
});

/** The provider has finished; its concurrency lease can safely be released. */
export class YouCamTaskError extends AppError {}

export class YouCamService {
  private readonly tokens = new TaskTokenService();
  private readonly client = new YouCamClient();

  async start(file: File, ownerId?: string, lease?: string): Promise<string> {
    const metadata = await this.client.request("/s2s/v2.0/file", uploadSchema, {
      method: "POST",
      body: JSON.stringify({
        files: [
          {
            content_type: file.type,
            file_name: "selfie" + (file.type === "image/png" ? ".png" : ".jpg"),
            file_size: file.size,
          },
        ],
      }),
    });
    const upload = metadata.files[0]?.requests[0];
    if (!upload || !safeHttpsUrl(upload.url))
      throw new AppError("The analysis service did not provide an upload destination.", 502);
    const uploadHost = new URL(upload.url).hostname;
    if (!uploadHost.endsWith(".amazonaws.com"))
      throw new AppError("The analysis service returned an unsupported upload destination.", 502);
    let response: Response;
    try {
      response = await fetch(upload.url, {
        method: "PUT",
        headers: upload.headers,
        body: await file.arrayBuffer(),
        signal: AbortSignal.timeout(30000),
        redirect: "error",
      });
    } catch {
      throw new AppError("Your photo could not be uploaded. Please retry.", 502);
    }
    if (!response.ok) throw new AppError("Your photo could not be uploaded. Please retry.", 502);
    const task = await this.client.request("/s2s/v2.0/task/skin-analysis", taskSchema, {
      method: "POST",
      body: JSON.stringify({
        src_file_id: metadata.files[0].file_id,
        dst_actions: ["moisture", "redness", "oiliness", "pore", "acne"],
        miniserver_args: { enable_mask_overlay: true },
        format: "json",
      }),
    });
    return this.tokens.issue(task.task_id, ownerId, lease);
  }

  async status(
    token: string,
    ownerId?: string,
  ): Promise<{ status: "running" | "success"; analysis?: SkinAnalysis }> {
    const taskId = this.tokens.verify(token, ownerId);
    const task = await this.client.request(
      `/s2s/v2.0/task/skin-analysis/${encodeURIComponent(taskId)}`,
      statusSchema,
    );
    if (task.task_status === "error") {
      const messages: Record<string, string> = {
        error_no_face:
          "YouCam could not detect a face. Use a clear, front-facing selfie with your whole face visible.",
        error_src_face_too_small:
          "Your face is too small in this photo. Move closer or crop the photo so your face fills more than 60% of its width, then retry.",
        error_multiple_people: "Use a photo with only one face visible.",
        error_large_face_angle: "Face the camera directly and keep your head upright, then retry.",
        error_decode_image: "YouCam could not read this photo. Choose another JPEG or PNG.",
        exceed_nsfw_retry_limits:
          "YouCam could not process this photo. Choose a different front-facing selfie.",
      };
      throw new YouCamTaskError(
        messages[task.error || ""] ||
          "This photo could not be analyzed. Try a brighter, front-facing photo with your face fully visible.",
        422,
      );
    }
    if (task.task_status !== "success") return { status: "running" };
    const results = resultsSchema.safeParse(task.results);
    if (!results.success)
      throw new YouCamTaskError(
        "YouCam finished the scan but did not return the requested JSON results. Please retry.",
        502,
      );
    const scores = results.data.output.flatMap((entry) => {
      const output = outputSchema.safeParse(entry);
      if (!output.success) return [];
      const masks = Array.isArray(output.data.mask_urls) ? output.data.mask_urls : [];
      const maskUrl = masks.find(
        (url): url is string => typeof url === "string" && safeHttpsUrl(url),
      );
      const parsed = scoreSchema.safeParse({
        concern: output.data.type,
        score: output.data.ui_score,
        maskUrl,
      });
      return parsed.success ? [parsed.data] : [];
    });
    if (!scores.length)
      throw new YouCamTaskError(
        "The scan finished but returned no supported scores. Please retry.",
        502,
      );
    return { status: "success", analysis: { mode: "live", scores } };
  }
}
