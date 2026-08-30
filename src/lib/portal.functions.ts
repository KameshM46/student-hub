import { createServerFn } from "@tanstack/react-start";
import { ObjectId } from "mongodb";
import { z } from "zod";

import {
  clearSessionCookie,
  hashPassword,
  readSession,
  setSessionCookie,
  verifyPassword,
} from "./auth.server";
import { getDb } from "./mongo.server";
import { normalizeId } from "./portal";

function dobPasswordSeed(dob: string) {
  return `dob-${dob.trim()}`;
}

const registerSchema = z.object({
  role: z.enum(["student", "admin"]),
  identifier: z.string().min(3).max(40),
  fullName: z.string().min(2).max(120),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adminCode: z.string().optional(),
});

export const registerAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => registerSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.role === "admin") {
      const expected = process.env["ADMIN_ACCESS_CODE"];
      if (!expected || data.adminCode?.trim() !== expected) {
        return { ok: false as const, error: "Invalid admin access code." };
      }
    }

    const registerNo = normalizeId(data.identifier).toUpperCase();
    if (!registerNo) return { ok: false as const, error: "Enter a valid number." };

    const db = await getDb();
    const users = db.collection("users");

    const existing = await users.findOne({ role: data.role, register_no: registerNo });
    if (existing) {
      return { ok: false as const, error: "That number is already registered. Try signing in." };
    }

    const passwordHash = await hashPassword(dobPasswordSeed(data.dob));

    await users.insertOne({
      role: data.role,
      register_no: registerNo,
      full_name: data.fullName.trim(),
      dob: data.dob,
      passwordHash,
      photo_url: null,
      department: null,
      year: null,
      section: null,
      phone: null,
      email: null,
      address: null,
      blood_group: null,
      guardian_name: null,
      guardian_phone: null,
      created_at: new Date().toISOString(),
    });

    return { ok: true as const };
  });

const loginSchema = z.object({
  role: z.enum(["student", "admin"]),
  identifier: z.string().min(1),
  dob: z.string().min(1),
});

export const loginAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    const registerNo = normalizeId(data.identifier).toUpperCase();
    const db = await getDb();
    const user = await db.collection("users").findOne({ role: data.role, register_no: registerNo });

    if (!user) return { ok: false as const, error: "Number or date of birth is incorrect." };

    const valid = await verifyPassword(dobPasswordSeed(data.dob), user["passwordHash"] as string);
    if (!valid) return { ok: false as const, error: "Number or date of birth is incorrect." };

    await setSessionCookie({ sub: user["_id"].toString(), role: user["role"] as "student" | "admin" });

    return { ok: true as const };
  });

export const logoutAccount = createServerFn({ method: "POST" }).handler(async () => {
  clearSessionCookie();
  return { ok: true as const };
});

/** Never throws — mirrors the old supabase.auth.getUser() "no session" shape. */
export const getMe = createServerFn({ method: "GET" }).handler(async () => {
  const session = await readSession();
  if (!session) return { user: null, profile: null, isAdmin: false };

  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: new ObjectId(session.sub) });
  if (!user) return { user: null, profile: null, isAdmin: false };

  return {
    user: { id: session.sub },
    isAdmin: session.role === "admin",
    profile: {
      id: session.sub,
      register_no: user["register_no"] as string,
      full_name: user["full_name"] as string,
      dob: (user["dob"] as string | null) ?? null,
      photo_url: (user["photo_url"] as string | null) ?? null,
      department: (user["department"] as string | null) ?? null,
      year: (user["year"] as string | null) ?? null,
      section: (user["section"] as string | null) ?? null,
      phone: (user["phone"] as string | null) ?? null,
      email: (user["email"] as string | null) ?? null,
      address: (user["address"] as string | null) ?? null,
      blood_group: (user["blood_group"] as string | null) ?? null,
      guardian_name: (user["guardian_name"] as string | null) ?? null,
      guardian_phone: (user["guardian_phone"] as string | null) ?? null,
    },
  };
});
