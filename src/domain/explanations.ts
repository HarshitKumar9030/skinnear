import { z } from "zod";
export const explanationSchema = z.object({
  summary: z.string().min(10).max(900),
  steps: z
    .array(z.object({ id: z.string().max(80), explanation: z.string().min(10).max(800) }))
    .min(1)
    .max(4),
});
export type RoutineExplanation = z.infer<typeof explanationSchema> & {
  transcript: string;
  narrationToken: string;
  sources: { name: string; url: string }[];
};
