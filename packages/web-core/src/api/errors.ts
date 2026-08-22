import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }
}

export function parseErrorMessage(status: number, body: unknown): string {
  if (!body || typeof body !== "object") {
    return statusText(status);
  }

  const data = body as ApiErrorBody;
  const detail = data.detail ?? data.message;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === "object" && item && "msg" in item ? String(item.msg) : String(item)))
      .filter(Boolean)
      .join(", ");
  }
  if (detail && typeof detail === "object") {
    return JSON.stringify(detail);
  }
  return statusText(status);
}

function statusText(status: number): string {
  const map: Record<number, string> = {
    400: "Bad request",
    401: "Please sign in again",
    403: "You do not have permission",
    404: "Not found",
    409: "Conflict",
    422: "Validation failed",
    500: "Server error",
  };
  return map[status] ?? `Request failed (${status})`;
}
