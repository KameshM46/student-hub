import { createFileRoute } from "@tanstack/react-router";

/**
 * Token-protected snapshot of the portal data, shaped as MongoDB collections.
 * A local sync script (scripts/sync-to-mongo.mjs) pulls this and upserts the
 * documents into MongoDB Atlas so everything is browsable in Compass.
 */
export const Route = createFileRoute("/api/public/mongo-export")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = process.env["MONGO_SYNC_TOKEN"];
        const provided =
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

        if (!token || provided.length !== token.length || provided !== token) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const [students, subjects, attendance, marks, roles] = await Promise.all([
          supabaseAdmin.from("profiles").select("*").order("register_no"),
          supabaseAdmin.from("subjects").select("*").order("code"),
          supabaseAdmin.from("attendance").select("*").order("date"),
          supabaseAdmin.from("marks").select("*").order("created_at"),
          supabaseAdmin.from("user_roles").select("user_id, role"),
        ]);

        const failed = [students, subjects, attendance, marks, roles].find((r) => r.error);
        if (failed?.error) {
          return new Response(`Export failed: ${failed.error.message}`, { status: 500 });
        }

        const roleByUser = new Map(
          (roles.data ?? []).map((r) => [r.user_id as string, r.role as string]),
        );

        return Response.json(
          {
            exported_at: new Date().toISOString(),
            collections: {
              students: (students.data ?? []).map((s) => ({
                ...s,
                account_type: roleByUser.get(s.id as string) ?? "student",
              })),
              subjects: subjects.data ?? [],
              attendance: attendance.data ?? [],
              marks: marks.data ?? [],
            },
          },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
