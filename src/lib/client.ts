"use client";

import type { ApiResult } from "@/lib/types";

/** Client-side fetch wrapper around the consistent API envelope. */
export async function api<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<ApiResult<T>> {
  try {
    const { json, ...rest } = init ?? {};
    const res = await fetch(path, {
      ...rest,
      headers: {
        ...(json !== undefined ? { "content-type": "application/json" } : {}),
        ...(rest.headers ?? {}),
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
    const data = (await res.json()) as ApiResult<T>;
    return data;
  } catch {
    return {
      success: false,
      error: { code: "network_error", message: "Network error — please check your connection." },
    };
  }
}
