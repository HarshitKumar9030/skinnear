import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof SyntaxError)
    return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 });
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: "Please check the supplied fields.", fields: error.flatten().fieldErrors },
      { status: 400 },
    );
  if (error instanceof AppError)
    return NextResponse.json(
      { error: error.message },
      {
        status: error.status,
        headers: {
          "Cache-Control": "no-store",
          ...(error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {}),
        },
      },
    );
  // Do not expose connection strings, provider bodies, or signed upload URLs.
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
