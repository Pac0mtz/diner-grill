// Shared admin API helper — token lives in sessionStorage, sent as Bearer.

const TOKEN_KEY = "dg_admin_token";

export function getAdminToken(): string {
  return sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function setAdminToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function adminFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${getAdminToken()}`,
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      typeof data.error === "string" ? data.error : `Request failed (HTTP ${res.status})`
    );
  }
  return data as T;
}

/** created_at comes from SQLite as UTC "YYYY-MM-DD HH:MM:SS" — render Chicago time. */
export function formatOrderTime(createdAt: string): string {
  const d = new Date(createdAt.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return createdAt;
  return d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
