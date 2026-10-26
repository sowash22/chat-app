import type { ApiFailure } from "@/lib/chat/types";

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string;

  constructor(failure: ApiFailure, status: number) {
    super(failure.message);
    this.code = failure.code;
    this.status = status;
    this.requestId = failure.requestId;
  }
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(input, { ...init, headers });
  const payload = (await response.json().catch(() => null)) as
    | (T & Partial<ApiFailure>)
    | null;

  if (!response.ok) {
    const failure: ApiFailure = {
      code: payload?.code ?? String(response.status),
      message: payload?.message ?? "request failed",
      requestId: payload?.requestId ?? "",
    };
    if (response.status === 401) {
      window.location.assign("/login");
    }
    throw new ApiRequestError(failure, response.status);
  }

  return payload as T;
}
