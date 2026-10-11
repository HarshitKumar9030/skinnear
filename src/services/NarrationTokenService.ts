import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { VisitorSessionService } from "./VisitorSessionService";

const schema = z.object({
  userId: z.string().max(80),
  expires: z.number(),
  text: z.string().min(1).max(6000),
});
/** Only previously validated explanations can reach the paid speech endpoint. */
export class NarrationTokenService {
  constructor(
    private readonly now = () => Date.now(),
    private readonly sessions = new VisitorSessionService(),
  ) {}
  issue(text: string, userId: string) {
    const payload = Buffer.from(
      JSON.stringify(schema.parse({ text, userId, expires: this.now() + 15 * 60000 })),
    ).toString("base64url");
    return `${payload}.${this.sessions.hash("narration:" + payload)}`;
  }
  verify(token: string, userId: string) {
    try {
      const [payload, signature, extra] = token.split(".");
      const expected = this.sessions.hash("narration:" + payload);
      if (
        extra ||
        !signature ||
        signature.length !== expected.length ||
        !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
      )
        throw new Error();
      const value = schema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
      if (value.expires <= this.now() || value.userId !== userId) throw new Error();
      return value.text;
    } catch {
      throw new AppError(
        "This narration expired or belongs to another browser. Generate the explanation again.",
        400,
      );
    }
  }
}
