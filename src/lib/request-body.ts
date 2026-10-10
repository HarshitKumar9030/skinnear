import { AppError } from "./errors";

/** Bound streamed bodies even when Content-Length is absent or false. */
export async function boundedBody(request: Request, maximum: number): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get("content-length")) > maximum) throw new AppError("This upload is too large.", 413);
  if (!request.body) throw new AppError("The request body is missing.", 400);
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  const deadline = Date.now() + 30000;
  try {
    while (true) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const read = reader.read();
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await Promise.race([read, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new AppError("The upload took too long. Please retry.", 408)), Math.max(1, deadline - Date.now())); })]);
      } finally { if (timer) clearTimeout(timer); }
      const { done, value } = chunk; if (done) break;
      length += value.length;
      if (length > maximum) { await reader.cancel(); throw new AppError("This upload is too large.", 413); }
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    if (error instanceof AppError) throw error;
    throw new AppError("The upload was interrupted. Please retry.", 400);
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
export async function boundedJson(request: Request, maximum = 32768): Promise<unknown> {
  try { return JSON.parse(new TextDecoder().decode(await boundedBody(request, maximum))); }
  catch (error) { if (error instanceof AppError) throw error; throw new AppError("Send a valid JSON request.", 400); }
}
