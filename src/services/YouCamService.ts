import { z } from "zod";
import { scoreSchema, type SkinAnalysis } from "@/domain/schemas";
import { AppError } from "@/lib/errors";
import { safeHttpsUrl } from "@/lib/http";
import { TaskTokenService } from "./TaskTokenService";
import { YouCamClient } from "./YouCamClient";

const uploadSchema = z.object({ files: z.array(z.object({ file_id: z.string().min(1), requests: z.array(z.object({ method: z.literal("PUT"), url: z.url(), headers: z.record(z.string(), z.string()) })).min(1) })).min(1) });
const taskSchema = z.object({ task_id: z.string().min(1) });
const statusSchema = z.object({ task_status: z.string(), results: z.object({ output: z.array(z.object({ type: z.string(), ui_score: z.number(), mask_urls: z.array(z.string()).optional() })) }).optional() });

export class YouCamService {
  private readonly tokens = new TaskTokenService();
  private readonly client = new YouCamClient();

  async start(file: File): Promise<string> {
    const metadata = await this.client.request("/s2s/v2.0/file", uploadSchema, { method: "POST", body: JSON.stringify({ files: [{ content_type: file.type, file_name: "selfie" + (file.type === "image/png" ? ".png" : ".jpg"), file_size: file.size }] }) });
    const upload = metadata.files[0]?.requests[0];
    if (!upload || !safeHttpsUrl(upload.url)) throw new AppError("The analysis service did not provide an upload destination.", 502);
    const uploadHost = new URL(upload.url).hostname;
    if (!uploadHost.endsWith(".amazonaws.com")) throw new AppError("The analysis service returned an unsupported upload destination.", 502);
    let response: Response;
    try { response = await fetch(upload.url, { method: "PUT", headers: upload.headers, body: await file.arrayBuffer(), signal: AbortSignal.timeout(30000), redirect: "error" }); }
    catch { throw new AppError("Your photo could not be uploaded. Please retry.", 502); }
    if (!response.ok) throw new AppError("Your photo could not be uploaded. Please retry.", 502);
    const task = await this.client.request("/s2s/v2.0/task/skin-analysis", taskSchema, { method: "POST", body: JSON.stringify({ src_file_id: metadata.files[0].file_id, dst_actions: ["moisture", "redness", "oiliness", "pore"], miniserver_args: { enable_mask_overlay: true }, format: "json" }) });
    return this.tokens.issue(task.task_id);
  }

  async status(token: string): Promise<{ status: "running" | "success"; analysis?: SkinAnalysis }> {
    const taskId = this.tokens.verify(token);
    const task = await this.client.request(`/s2s/v2.0/task/skin-analysis/${encodeURIComponent(taskId)}`, statusSchema);
    if (task.task_status === "error") throw new AppError("This photo could not be analyzed. Try a brighter, front-facing photo with your face fully visible.", 422);
    if (task.task_status !== "success") return { status: "running" };
    const scores = (task.results?.output ?? []).flatMap((output) => {
      const parsed = scoreSchema.safeParse({ concern: output.type, score: output.ui_score, maskUrl: output.mask_urls?.find(safeHttpsUrl) });
      return parsed.success ? [parsed.data] : [];
    });
    if (!scores.length) throw new AppError("The scan finished but returned no supported scores. Please retry.", 502);
    return { status: "success", analysis: { mode: "live", scores } };
  }

}
