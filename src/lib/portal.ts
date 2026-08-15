export type PortalRole = "student" | "admin";

/** Register/staff numbers are turned into a stable internal login address. */
export function normalizeId(id: string) {
  return id.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function loginEmail(role: PortalRole, id: string) {
  const domain = role === "admin" ? "admin.campusportal.app" : "students.campusportal.app";
  return `${normalizeId(id)}@${domain}`;
}

/** Date of birth is the password; keep one canonical format. */
export function dobPassword(dob: string) {
  return `dob-${dob.trim()}`;
}

export function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}
