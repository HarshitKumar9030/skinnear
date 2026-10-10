/** Typed browser boundary. Provider keys never enter this module. */
export class SkinNearApi {
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(path, options);
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || "The request could not be completed.");
    return body as T;
  }

  post<T>(path: string, body: unknown, signal?: AbortSignal) {
    return this.request<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  }
}
