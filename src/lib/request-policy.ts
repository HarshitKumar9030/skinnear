/** Never trust Host to disable protection on a public production deployment. */
export function isLocalDevelopment(headers: Headers): boolean {
  return process.env.NODE_ENV === "development" && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(headers.get("host") || "");
}
