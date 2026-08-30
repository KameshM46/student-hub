import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "../../../lib/mongo.server";

/**
 * Token-protected snapshot of the portal data, shaped as MongoDB collections.
 *
 * This endpoint now reads directly from MongoDB Atlas.
 * Supabase is no longer required.
 */
export const Route = createFileRoute("/api/public/mongo-export")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = process.env["MONGO_SYNC_TOKEN"];

        const provided =
          request.headers
            .get("authorization")
            ?.replace(/^Bearer\s+/i, "") ?? "";

        if (
          !token ||
          provided.length !== token.length ||
          provided !== token
        ) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const db = await getDb();

          const [students, subjects, attendance, marks] =
            await Promise.all([
              db
                .collection("users")
                .find({ role: "student" })
                .sort({ register_no: 1 })
                .toArray(),

              db
                .collection("subjects")
                .find()
                .sort({ code: 1 })
                .toArray(),

              db
                .collection("attendance")
                .find()
                .sort({ date: 1 })
                .toArray(),

              db
                .collection("marks")
                .find()
                .sort({ created_at: 1 })
                .toArray(),
            ]);

          const serialize = (doc: Record<string, any>) => {
            const { _id, ...rest } = doc;

            return {
              id: _id?.toString(),
              ...rest,
            };
          };

          const studentData = students.map((student) => ({
            ...serialize(student),
            account_type: "student",
          }));

          const subjectData = subjects.map(serialize);
          const attendanceData = attendance.map(serialize);
          const marksData = marks.map(serialize);

          const rolesData = students.map((student) => ({
            user_id: student._id.toString(),
            role: student.role ?? "student",
          }));

          return Response.json(
            {
              exported_at: new Date().toISOString(),

              collections: {
                students: studentData,
                subjects: subjectData,
                attendance: attendanceData,
                marks: marksData,
                roles: rolesData,
              },
            },
            {
              headers: {
                "cache-control": "no-store",
              },
            },
          );
        } catch (error) {
          console.error("MongoDB export failed:", error);

          const message =
            error instanceof Error
              ? error.message
              : "Unknown MongoDB error";

          return new Response(
            `Export failed: ${message}`,
            { status: 500 },
          );
        }
      },
    },
  },
});