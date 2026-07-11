import { NextResponse } from "next/server";
import { ZodError, type z, type ZodTypeAny } from "zod";
import type { ApiResult } from "@/lib/types";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  const body: ApiResult<T> = { success: true, data };
  return NextResponse.json(body, init);
}

export function fail(code: string, message: string, status = 400): NextResponse {
  const body: ApiResult<never> = { success: false, error: { code, message } };
  return NextResponse.json(body, { status });
}

/**
 * Wraps a route handler: validation and ApiErrors become clean envelopes,
 * unexpected errors become a generic 500 (stack traces are never exposed).
 */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) {
      return fail(err.code, err.message, err.status);
    }
    if (err instanceof ZodError) {
      const first = err.errors[0];
      return fail(
        "validation_error",
        first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input.",
        400,
      );
    }
    console.error("[joink] unhandled API error:", err);
    return fail("internal_error", "Something went wrong on our side. Please try again.", 500);
  }
}

export async function parseBody<S extends ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError("invalid_json", "Request body must be valid JSON.", 400);
  }
  return schema.parse(json);
}

export const errors = {
  unauthorized: () => new ApiError("unauthorized", "You must be signed in.", 401),
  notFound: (what = "Resource") => new ApiError("not_found", `${what} not found.`, 404),
  forbidden: () => new ApiError("forbidden", "You do not have access to this resource.", 403),
  limit: (message: string) => new ApiError("limit_reached", message, 402),
};
