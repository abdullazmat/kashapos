export interface ApiErrorShape {
  success?: boolean;
  error?: string;
  message?: string;
  errors?: unknown[];
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: unknown[];
}

export function isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
  return (
    !!payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  );
}

export function unwrapApiResponse<T>(payload: unknown): T {
  if (isApiEnvelope<T>(payload)) {
    return payload.data;
  }

  return payload as T;
}

export function getApiErrorMessage(
  payload: unknown,
  fallback = "Request failed",
): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidate = payload as ApiErrorShape;
  return candidate.error || candidate.message || fallback;
}

export async function apiRequest<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, response.statusText));
  }

  return unwrapApiResponse<T>(payload);
}
