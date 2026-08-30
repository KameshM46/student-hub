// Server functions for all portal data — the MongoDB replacement for every
// `supabase.from(...)` call that used to run directly in route components.
// Since MongoDB has no Row Level Security, every authorization check that
// Postgres RLS used to enforce is done explicitly here instead.
import { createServerFn } from "@tanstack/react-start";
import { ObjectId, type Document } from "mongodb";
import { z } from "zod";

import { requireAdmin, requireAuth } from "./auth.middleware";
import { getDb } from "./mongo.server";

function serializeSubject(doc: Document) {
  return {
    id: (doc["_id"] as ObjectId).toString(),
    code: doc["code"] as string,
    name: doc["name"] as string,
    note: (doc["note"] as string | null) ?? null,
    assignment: (doc["assignment"] as string | null) ?? null,
    updated_at: doc["updated_at"] as string,
  };
}

function serializeProfile(doc: Document) {
  return {
    id: (doc["_id"] as ObjectId).toString(),
    register_no: doc["register_no"] as string,
    full_name: doc["full_name"] as string,
    dob: (doc["dob"] as string | null) ?? null,
    photo_url: (doc["photo_url"] as string | null) ?? null,
    department: (doc["department"] as string | null) ?? null,
    year: (doc["year"] as string | null) ?? null,
    section: (doc["section"] as string | null) ?? null,
    phone: (doc["phone"] as string | null) ?? null,
    email: (doc["email"] as string | null) ?? null,
    address: (doc["address"] as string | null) ?? null,
    blood_group: (doc["blood_group"] as string | null) ?? null,
    guardian_name: (doc["guardian_name"] as string | null) ?? null,
    guardian_phone: (doc["guardian_phone"] as string | null) ?? null,
  };
}

function serializeAttendance(doc: Document) {
  return {
    id: (doc["_id"] as ObjectId).toString(),
    date: doc["date"] as string,
    status: doc["status"] as string,
    subject_id: (doc["subject_id"] as string | null) ?? null,
    student_id: doc["student_id"] as string,
  };
}

function serializeMark(doc: Document) {
  return {
    id: (doc["_id"] as ObjectId).toString(),
    student_id: doc["student_id"] as string,
    subject_id: (doc["subject_id"] as string | null) ?? null,
    subject_name: doc["subject_name"] as string,
    exam_name: doc["exam_name"] as string,
    marks_obtained: doc["marks_obtained"] as number,
    max_marks: doc["max_marks"] as number,
  };
}

// ---- Subjects ----

export const listSubjects = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    const db = await getDb();
    const docs = await db.collection("subjects").find().sort({ code: 1 }).toArray();
    return docs.map(serializeSubject);
  });

const addSubjectSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(160),
});

export const addSubject = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) => addSubjectSchema.parse(data))
  .handler(async ({ data }) => {
    const db = await getDb();
    await db.collection("subjects").insertOne({
      code: data.code.toUpperCase(),
      name: data.name,
      note: null,
      assignment: null,
      updated_at: new Date().toISOString(),
    });
    return { ok: true as const };
  });

const updateSubjectSchema = z.object({
  id: z.string(),
  note: z.string().nullable(),
  assignment: z.string().nullable(),
});

export const updateSubject = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) => updateSubjectSchema.parse(data))
  .handler(async ({ data }) => {
    const db = await getDb();
    await db
      .collection("subjects")
      .updateOne(
        { _id: new ObjectId(data.id) },
        { $set: { note: data.note, assignment: data.assignment, updated_at: new Date().toISOString() } },
      );
    return { ok: true as const };
  });

// ---- Students (admin roster) ----

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const db = await getDb();
    const docs = await db
      .collection("users")
      .find({ role: "student" })
      .sort({ register_no: 1 })
      .toArray();
    return docs.map(serializeProfile);
  });

// ---- Attendance ----

const studentIdInput = z.object({ studentId: z.string() });

export const listAttendance = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => studentIdInput.parse(data))
  .handler(async ({ data, context }) => {
    if (context.role !== "admin" && context.userId !== data.studentId) {
      throw new Error("Forbidden: you can only view your own attendance");
    }
    const db = await getDb();
    const docs = await db
      .collection("attendance")
      .find({ student_id: data.studentId })
      .sort({ date: -1 })
      .toArray();
    return docs.map(serializeAttendance);
  });

const addAttendanceSchema = z.object({
  studentId: z.string(),
  subjectId: z.string().nullable(),
  date: z.string(),
  status: z.enum(["present", "absent"]),
});

export const addAttendance = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((data: unknown) => addAttendanceSchema.parse(data))
  .handler(async ({ data }) => {
    const db = await getDb();
    await db.collection("attendance").insertOne({
      student_id: data.studentId,
      subject_id: data.subjectId,
      date: data.date,
      status: data.status,
    });
    return { ok: true as const };
  });

// ---- Marks ----

export const listMarks = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => studentIdInput.parse(data))
  .handler(async ({ data, context }) => {
    if (context.role !== "admin" && context.userId !== data.studentId) {
      throw new Error("Forbidden: you can only view your own marks");
    }
    const db = await getDb();
    const docs = await db
      .collection("marks")
      .find({ student_id: data.studentId })
      .sort({ created_at: -1 })
      .toArray();
    return docs.map(serializeMark);
  });

const addMarkSchema = z.object({
  studentId: z.string(),
  subjectId: z.string(),
  subjectName: z.string(),
  examName: z.string(),
  marksObtained: z.number(),
  maxMarks: z.number(),
});

export const addMark = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => addMarkSchema.parse(data))
  .handler(async ({ data, context }) => {
    if (context.role !== "admin" && context.userId !== data.studentId) {
      throw new Error("Forbidden: you can only add your own marks");
    }
    const db = await getDb();
    await db.collection("marks").insertOne({
      student_id: data.studentId,
      subject_id: data.subjectId,
      subject_name: data.subjectName,
      exam_name: data.examName,
      marks_obtained: data.marksObtained,
      max_marks: data.maxMarks,
      added_by: context.userId,
      created_at: new Date().toISOString(),
    });
    return { ok: true as const };
  });

const deleteMarkSchema = z.object({ id: z.string() });

export const deleteMark = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => deleteMarkSchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = await getDb();
    const mark = await db.collection("marks").findOne({ _id: new ObjectId(data.id) });
    if (!mark) return { ok: true as const };
    if (context.role !== "admin" && mark["student_id"] !== context.userId) {
      throw new Error("Forbidden: you can only delete your own marks");
    }
    await db.collection("marks").deleteOne({ _id: new ObjectId(data.id) });
    return { ok: true as const };
  });

// ---- Profile (self-service "My details") ----

const updateProfileSchema = z.object({
  full_name: z.string().min(1),
  dob: z.string().nullable(),
  department: z.string().nullable(),
  year: z.string().nullable(),
  section: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  blood_group: z.string().nullable(),
  guardian_name: z.string().nullable(),
  guardian_phone: z.string().nullable(),
  photo_url: z.string().nullable(),
  address: z.string().nullable(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => updateProfileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = await getDb();
    await db.collection("users").updateOne({ _id: new ObjectId(context.userId) }, { $set: data });
    return { ok: true as const };
  });
