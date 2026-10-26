import { NextResponse } from "next/server";

const HTTP_STATUS: Record<string, number> = {
  "22023": 400,
  "22P02": 400,
  "23514": 400,
  "23505": 409,
  "28000": 401,
  "42501": 403,
  P0002: 404,
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function apiError(
  status: number,
  code: string,
  message: string,
  requestId: string,
) {
  const response = NextResponse.json(
    { code, message, requestId },
    { status },
  );
  response.headers.set("x-request-id", requestId);
  return response;
}

export function postgresError(
  error: { code?: string; message?: string },
  requestId: string,
) {
  const code = error.code ?? "50000";
  const status = HTTP_STATUS[code] ?? 500;
  const known = code in HTTP_STATUS || code.startsWith("PGRST");
  const message = known && error.message ? error.message : "request failed";
  return apiError(status, known ? code : "50000", message, requestId);
}

export async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

export function parseSequence(value: string | null) {
  if (value == null || value === "") return null;
  if (!/^\d+$/.test(value)) return "invalid" as const;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return "invalid" as const;
  return parsed;
}

function isFrameworkControlFlow(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  if ("digest" in error) return true;
  return (
    error instanceof Error &&
    error.message.includes("During prerendering")
  );
}

type Handler = (
  request: Request,
  requestId: string,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

export function withApi(handler: Handler) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> } = {
      params: Promise.resolve({}),
    },
  ) => {
    const requestId = crypto.randomUUID();
    try {
      const response = await handler(request, requestId, context);
      if (!response.headers.has("x-request-id")) {
        response.headers.set("x-request-id", requestId);
      }
      return response;
    } catch (error) {
      if (isFrameworkControlFlow(error)) throw error;
      console.error(
        "api error",
        requestId,
        error instanceof Error ? error.message : "unknown",
      );
      return apiError(500, "50000", "request failed", requestId);
    }
  };
}
