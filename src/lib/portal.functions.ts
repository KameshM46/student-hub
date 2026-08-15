import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
    const { loginEmail, dobPassword, normalizeId } = await import("./portal");

    if (data.role === "admin") {
      const expected = process.env["ADMIN_ACCESS_CODE"];
      if (!expected || data.adminCode?.trim() !== expected) {
        return { ok: false as const, error: "Invalid admin access code." };
      }
    }

    const identifier = normalizeId(data.identifier);
    if (!identifier) return { ok: false as const, error: "Enter a valid number." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: loginEmail(data.role, identifier),
      password: dobPassword(data.dob),
      email_confirm: true,
      user_metadata: { full_name: data.fullName, register_no: identifier.toUpperCase() },
    });

    if (error || !created.user) {
      const message = error?.message ?? "Could not create the account.";
      return {
        ok: false as const,
        error: /already/i.test(message)
          ? "That number is already registered. Try signing in."
          : message,
      };
    }

    const userId = created.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      register_no: identifier.toUpperCase(),
      full_name: data.fullName.trim(),
      dob: data.dob,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { ok: false as const, error: "That number is already registered." };
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });

    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { ok: false as const, error: "Could not assign the account type." };
    }

    return { ok: true as const };
  });
