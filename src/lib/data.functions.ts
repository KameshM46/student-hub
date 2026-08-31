import { createServerFn } from "@tanstack/react-start";
import { ObjectId, type Document } from "mongodb";
import { z } from "zod";

import {
  requireAdmin,
  requireAuth,
} from "./auth.middleware";
import { getDb } from "./mongo.server";

/* -------------------------------------------------------------------------- */
/* SERIALIZERS                                                                */
/* -------------------------------------------------------------------------- */

function serializeSubject(doc: Document) {
  return {
    id: (doc["_id"] as ObjectId).toString(),

    code: doc["code"] as string,

    name: doc["name"] as string,

    staff_name:
      (doc["staff_name"] as string | null) ??
      null,

    note:
      (doc["note"] as string | null) ??
      null,

    assignment:
      (doc["assignment"] as string | null) ??
      null,

    assignment_file:
      (doc["assignment_file"] as {
        name: string;
        dataUrl: string;
      } | null) ?? null,

    updated_at:
      doc["updated_at"] as string,
  };
}

function serializeProfile(doc: Document) {
  return {
    id: (doc["_id"] as ObjectId).toString(),

    register_no:
      doc["register_no"] as string,

    full_name:
      doc["full_name"] as string,

    dob:
      (doc["dob"] as string | null) ??
      null,

    photo_url:
      (doc["photo_url"] as string | null) ??
      null,

    department:
      (doc["department"] as string | null) ??
      null,

    year:
      (doc["year"] as string | null) ??
      null,

    section:
      (doc["section"] as string | null) ??
      null,

    phone:
      (doc["phone"] as string | null) ??
      null,

    email:
      (doc["email"] as string | null) ??
      null,

    address:
      (doc["address"] as string | null) ??
      null,

    blood_group:
      (doc["blood_group"] as string | null) ??
      null,

    guardian_name:
      (doc["guardian_name"] as string | null) ??
      null,

    guardian_phone:
      (doc["guardian_phone"] as string | null) ??
      null,

    instagram_url:
      (doc["instagram_url"] as string | null) ??
      null,

    linkedin_url:
      (doc["linkedin_url"] as string | null) ??
      null,

    github_url:
      (doc["github_url"] as string | null) ??
      null,

    leetcode_url:
      (doc["leetcode_url"] as string | null) ??
      null,

    hackerrank_url:
      (doc["hackerrank_url"] as string | null) ??
      null,

    portfolio_url:
      (doc["portfolio_url"] as string | null) ??
      null,

    twitter_url:
      (doc["twitter_url"] as string | null) ??
      null,

    youtube_url:
      (doc["youtube_url"] as string | null) ??
      null,
  };
}

function serializeAttendance(doc: Document) {
  return {
    id:
      (doc["_id"] as ObjectId).toString(),

    date:
      doc["date"] as string,

    status:
      doc["status"] as string,

    subject_id:
      (doc["subject_id"] as string | null) ??
      null,

    student_id:
      doc["student_id"] as string,
  };
}

function serializeMark(doc: Document) {
  return {
    id:
      (doc["_id"] as ObjectId).toString(),

    student_id:
      doc["student_id"] as string,

    subject_id:
      (doc["subject_id"] as string | null) ??
      null,

    subject_name:
      doc["subject_name"] as string,

    exam_name:
      doc["exam_name"] as string,

    marks_obtained:
      doc["marks_obtained"] as number,

    max_marks:
      doc["max_marks"] as number,
  };
}

/* -------------------------------------------------------------------------- */
/* SUBJECTS                                                                   */
/* -------------------------------------------------------------------------- */

export const listSubjects = createServerFn({
  method: "GET",
})
  .middleware([requireAuth])
  .handler(async () => {
    const db = await getDb();

    const docs = await db
      .collection("subjects")
      .find()
      .sort({ code: 1 })
      .toArray();

    return docs.map(serializeSubject);
  });

const addSubjectSchema = z.object({
  code: z.string().trim().min(1).max(20),

  name: z.string().trim().min(1).max(160),

  staffName:
    z.string()
      .trim()
      .max(160)
      .nullable()
      .optional(),
});

export const addSubject = createServerFn({
  method: "POST",
})
  .middleware([requireAdmin])
  .inputValidator((data: unknown) =>
    addSubjectSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const db = await getDb();

    await db.collection("subjects").insertOne({
      code:
        data.code.toUpperCase(),

      name:
        data.name,

      staff_name:
        data.staffName?.trim() ||
        null,

      note: null,

      assignment: null,

      updated_at:
        new Date().toISOString(),
    });

    return {
      ok: true as const,
    };
  });

const updateSubjectSchema =
  z.object({
    id: z.string(),

    code:
      z.string()
        .trim()
        .min(1)
        .max(20),

    name:
      z.string()
        .trim()
        .min(1)
        .max(160),

    staffName:
      z.string()
        .trim()
        .max(160)
        .nullable()
        .optional(),

    note:
      z.string().nullable(),

    assignment:
      z.string().nullable(),

    assignmentFile:
      z
        .object({
          name:
            z.string()
              .trim()
              .min(1)
              .max(200),

          dataUrl:
            z.string()
              .startsWith(
                "data:application/pdf",
              )
              .refine(
                (v) =>
                  v.length <
                  10_000_000,
                "PDF is too large (max ~6MB).",
              ),
        })
        .nullable()
        .optional(),
  });

export const updateSubject =
  createServerFn({
    method: "POST",
  })
    .middleware([requireAdmin])
    .inputValidator((data: unknown) =>
      updateSubjectSchema.parse(data),
    )
    .handler(async ({ data }) => {
      const db = await getDb();

      const update: Record<
        string,
        unknown
      > = {
        code:
          data.code.toUpperCase(),

        name:
          data.name,

        staff_name:
          data.staffName?.trim() ||
          null,

        note:
          data.note,

        assignment:
          data.assignment,

        updated_at:
          new Date().toISOString(),
      };

      if (
        data.assignmentFile !==
        undefined
      ) {
        update[
          "assignment_file"
        ] =
          data.assignmentFile;
      }

      await db
        .collection("subjects")
        .updateOne(
          {
            _id:
              new ObjectId(data.id),
          },
          {
            $set: update,
          },
        );

      return {
        ok: true as const,
      };
    });

/* -------------------------------------------------------------------------- */
/* STUDENTS                                                                   */
/* -------------------------------------------------------------------------- */

export const listStudents =
  createServerFn({
    method: "GET",
  })
    .middleware([requireAdmin])
    .handler(async () => {
      const db = await getDb();

      const docs =
        await db
          .collection("users")
          .find({
            role: "student",
          })
          .sort({
            register_no: 1,
          })
          .toArray();

      return docs.map(
        serializeProfile,
      );
    });

/* -------------------------------------------------------------------------- */
/* ATTENDANCE                                                                 */
/* -------------------------------------------------------------------------- */

const studentIdInput =
  z.object({
    studentId:
      z.string(),
  });

export const listAttendance =
  createServerFn({
    method: "GET",
  })
    .middleware([requireAuth])
    .inputValidator(
      (data: unknown) =>
        studentIdInput.parse(
          data,
        ),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        if (
          context.role !==
            "admin" &&
          context.userId !==
            data.studentId
        ) {
          throw new Error(
            "Forbidden: you can only view your own attendance",
          );
        }

        const db =
          await getDb();

        const docs =
          await db
            .collection(
              "attendance",
            )
            .find({
              student_id:
                data.studentId,
            })
            .sort({
              date: -1,
            })
            .toArray();

        return docs.map(
          serializeAttendance,
        );
      },
    );

const addAttendanceSchema =
  z.object({
    studentId:
      z.string(),

    subjectId:
      z.string().nullable(),

    date:
      z.string(),

    status:
      z.enum([
        "present",
        "absent",
      ]),
  });

export const addAttendance =
  createServerFn({
    method: "POST",
  })
    .middleware([requireAdmin])
    .inputValidator(
      (data: unknown) =>
        addAttendanceSchema.parse(
          data,
        ),
    )
    .handler(
      async ({ data }) => {
        const db =
          await getDb();

        await db
          .collection(
            "attendance",
          )
          .insertOne({
            student_id:
              data.studentId,

            subject_id:
              data.subjectId,

            date:
              data.date,

            status:
              data.status,

            added_at:
              new Date().toISOString(),
          });

        return {
          ok: true as const,
        };
      },
    );

/* -------------------------------------------------------------------------- */
/* MARKS                                                                      */
/* -------------------------------------------------------------------------- */

export const listMarks =
  createServerFn({
    method: "GET",
  })
    .middleware([requireAuth])
    .inputValidator(
      (data: unknown) =>
        studentIdInput.parse(
          data,
        ),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        if (
          context.role !==
            "admin" &&
          context.userId !==
            data.studentId
        ) {
          throw new Error(
            "Forbidden: you can only view your own marks",
          );
        }

        const db =
          await getDb();

        const docs =
          await db
            .collection(
              "marks",
            )
            .find({
              student_id:
                data.studentId,
            })
            .sort({
              created_at: -1,
            })
            .toArray();

        return docs.map(
          serializeMark,
        );
      },
    );

const addMarkSchema =
  z.object({
    studentId:
      z.string(),

    subjectId:
      z.string(),

    subjectName:
      z.string(),

    examName:
      z.string(),

    marksObtained:
      z.number(),

    maxMarks:
      z.number(),
  });

/*
 * IMPORTANT:
 * Only admins can add marks.
 *
 * Students can VIEW their own marks,
 * but cannot create or change marks.
 */

export const addMark =
  createServerFn({
    method: "POST",
  })
    .middleware([requireAdmin])
    .inputValidator(
      (data: unknown) =>
        addMarkSchema.parse(
          data,
        ),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const db =
          await getDb();

        await db
          .collection("marks")
          .insertOne({
            student_id:
              data.studentId,

            subject_id:
              data.subjectId,

            subject_name:
              data.subjectName,

            exam_name:
              data.examName,

            marks_obtained:
              data.marksObtained,

            max_marks:
              data.maxMarks,

            added_by:
              context.userId,

            created_at:
              new Date().toISOString(),
          });

        return {
          ok: true as const,
        };
      },
    );

/*
 * Marks are admin-managed, so
 * deletion is admin-only as well.
 */

const deleteMarkSchema =
  z.object({
    id:
      z.string(),
  });

export const deleteMark =
  createServerFn({
    method: "POST",
  })
    .middleware([requireAdmin])
    .inputValidator(
      (data: unknown) =>
        deleteMarkSchema.parse(
          data,
        ),
    )
    .handler(
      async ({ data }) => {
        const db =
          await getDb();

        await db
          .collection("marks")
          .deleteOne({
            _id:
              new ObjectId(
                data.id,
              ),
          });

        return {
          ok: true as const,
        };
      },
    );

/* -------------------------------------------------------------------------- */
/* PROFILE                                                                    */
/* -------------------------------------------------------------------------- */

const updateProfileSchema =
  z.object({
    full_name:
      z.string().min(1),

    dob:
      z.string().nullable(),

    department:
      z.string().nullable(),

    year:
      z.string().nullable(),

    section:
      z.string().nullable(),

    phone:
      z.string().nullable(),

    email:
      z.string().nullable(),

    blood_group:
      z.string().nullable(),

    guardian_name:
      z.string().nullable(),

    guardian_phone:
      z.string().nullable(),

    photo_url:
      z.string().nullable(),

    address:
      z.string().nullable(),

    instagram_url:
      z.string().nullable(),

    linkedin_url:
      z.string().nullable(),

    github_url:
      z.string().nullable(),

    leetcode_url:
      z.string().nullable(),

    hackerrank_url:
      z.string().nullable(),

    portfolio_url:
      z.string().nullable(),

    twitter_url:
      z.string().nullable(),

    youtube_url:
      z.string().nullable(),
  });

export const updateProfile =
  createServerFn({
    method: "POST",
  })
    .middleware([requireAuth])
    .inputValidator(
      (data: unknown) =>
        updateProfileSchema.parse(
          data,
        ),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const db =
          await getDb();

        /*
         * context.userId means the
         * currently logged-in user.
         *
         * A student cannot pass
         * another student's ID here.
         */
        await db
          .collection("users")
          .updateOne(
            {
              _id:
                new ObjectId(
                  context.userId,
                ),
            },
            {
              $set: data,
            },
          );

        return {
          ok: true as const,
        };
      },
    );