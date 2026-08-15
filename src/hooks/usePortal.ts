import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  register_no: string;
  full_name: string;
  dob: string | null;
  photo_url: string | null;
  department: string | null;
  year: string | null;
  section: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  blood_group: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
};

export type Subject = {
  id: string;
  code: string;
  name: string;
  note: string | null;
  assignment: string | null;
  updated_at: string;
};

export type AttendanceRow = {
  id: string;
  date: string;
  status: string;
  subject_id: string | null;
  student_id: string;
};

export type MarkRow = {
  id: string;
  student_id: string;
  subject_id: string | null;
  subject_name: string;
  exam_name: string;
  marks_obtained: number;
  max_marks: number;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return { user: null, profile: null, isAdmin: false };

      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      return {
        user,
        profile: (profile as Profile | null) ?? null,
        isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      };
    },
  });
}

export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, code, name, note, assignment, updated_at")
        .order("code");
      if (error) throw error;
      return (data ?? []) as Subject[];
    },
  });
}

export function useStudents(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("register_no");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

export function useAttendance(studentId: string | undefined) {
  return useQuery({
    enabled: Boolean(studentId),
    queryKey: ["attendance", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, date, status, subject_id, student_id")
        .eq("student_id", studentId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });
}

export function useMarks(studentId: string | undefined) {
  return useQuery({
    enabled: Boolean(studentId),
    queryKey: ["marks", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marks")
        .select("id, student_id, subject_id, subject_name, exam_name, marks_obtained, max_marks")
        .eq("student_id", studentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MarkRow[];
    },
  });
}
