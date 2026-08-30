// Client-safe helpers (no server-only imports here — this file ships to the browser).
export type PortalRole = "student" | "admin";

/** Register/staff numbers are normalized to a stable, case-insensitive key. */
export function normalizeId(id: string) {
  return id.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}
