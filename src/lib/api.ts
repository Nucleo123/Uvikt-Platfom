import { NextResponse } from "next/server";

/**
 * Wraps a route handler to convert thrown errors into structured JSON responses.
 * Usage:
 *   export const GET = withApi(async (req) => { ... return NextResponse.json(...) })
 */
export function withApi<T extends (...args: unknown[]) => Promise<Response>>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (err) {
      const status = typeof err === "object" && err !== null && "status" in err ? (err as { status: number }).status : 500;
      const message = err instanceof Error ? err.message : "Internal error";
      // Don't leak unexpected stack traces in 500s
      const safe = status >= 500 ? "Internal server error" : message;
      if (status >= 500) console.error("[api:error]", err);
      return NextResponse.json({ error: safe }, { status });
    }
  }) as T;
}
