import { cookies } from "next/headers";
import { AbuseProtectionService } from "@/services/AbuseProtectionService";
import { VISITOR_COOKIE, VisitorSessionService } from "@/services/VisitorSessionService";
import { AppError } from "./errors";
import { isLocalDevelopment } from "./request-policy";

export async function limitRequest(headers: Headers, scope: string, maximum = 20) {
  const origin = headers.get("origin");
  let sameOrigin = !origin;
  try {
    sameOrigin ||=
      origin === process.env.APP_ORIGIN || new URL(origin!).host === headers.get("host");
  } catch {
    /* Invalid origins are rejected below. */
  }
  if (headers.get("sec-fetch-site") === "cross-site" || !sameOrigin)
    throw new AppError("Send this request from the SkinNear app.", 403);
  const jar = await cookies();
  const session = new VisitorSessionService().resolve(jar.get(VISITOR_COOKIE)?.value);
  if (session.cookie)
    jar.set(VISITOR_COOKIE, session.cookie, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 86400,
      path: "/",
    });
  const protection = new AbuseProtectionService(undefined, undefined, !isLocalDevelopment(headers));
  await protection.request(headers, session.id, scope, maximum);
  return { userId: session.id, protection };
}
