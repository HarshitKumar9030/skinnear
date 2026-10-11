import { AppError } from "./errors";

export async function fetchJson<T>(url: string | URL, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
    });
  } catch {
    throw new AppError("The connected service could not be reached. Please retry.", 502);
  }
  if (!response.ok) {
    throw new AppError(
      response.status === 401 || response.status === 403
        ? "The connected service rejected its credentials. Check your server configuration."
        : response.status === 429
          ? "The connected service is busy. Please try again later."
          : "The connected service could not complete this request.",
      502,
    );
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new AppError("The connected service returned an unreadable response.", 502);
  }
}

export function safeHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
