// Shared admin API helper — token lives in sessionStorage, sent as Bearer.

const TOKEN_KEY = "dg_admin_token";
const USER_KEY = "dg_admin_username";

export function getAdminToken(): string {
  return sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function setAdminToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getAdminUsername(): string {
  return sessionStorage.getItem(USER_KEY) ?? "";
}

export function setAdminUsername(username: string) {
  sessionStorage.setItem(USER_KEY, username);
}

export function clearAdminToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export async function adminLogin(username: string, password: string): Promise<string> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      typeof data.error === "string" ? data.error : `Login failed (HTTP ${res.status})`
    );
  }
  const name = String(data.username || username).trim();
  setAdminToken(String(data.token));
  setAdminUsername(name);
  return name;
}

export async function adminLogout(): Promise<void> {
  try {
    await adminFetch("/api/admin/logout", { method: "POST" });
  } catch {
    // Session may already be gone — clearing locally is enough.
  }
  clearAdminToken();
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

/** created_at is an ISO timestamp from PostgreSQL — render Chicago time. */
export function formatOrderTime(createdAt: string): string {
  const iso = createdAt.includes("T") ? createdAt : createdAt.replace(" ", "T") + "Z";
  const d = new Date(iso);
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
