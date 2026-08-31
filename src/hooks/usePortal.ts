import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listAttendance, listMarks, listStudents, listSubjects } from "@/lib/data.functions";
import { getMe } from "@/lib/portal.functions";

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
  assignment_file: { name: string; dataUrl: string } | null;
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
  const getMeFn = useServerFn(getMe);
  return useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
  });
}

export function useSubjects() {
  const listSubjectsFn = useServerFn(listSubjects);
  return useQuery({
    queryKey: ["subjects"],
    queryFn: () => listSubjectsFn(),
  });
}

export function useStudents(enabled: boolean) {
  const listStudentsFn = useServerFn(listStudents);
  return useQuery({
    enabled,
    queryKey: ["students"],
    queryFn: () => listStudentsFn(),
  });
}

export function useAttendance(studentId: string | undefined) {
  const listAttendanceFn = useServerFn(listAttendance);
  return useQuery({
    enabled: Boolean(studentId),
    queryKey: ["attendance", studentId],
    queryFn: () => listAttendanceFn({ data: { studentId: studentId! } }),
  });
}

export function useMarks(studentId: string | undefined) {
  const listMarksFn = useServerFn(listMarks);
  return useQuery({
    enabled: Boolean(studentId),
    queryKey: ["marks", studentId],
    queryFn: () => listMarksFn({ data: { studentId: studentId! } }),
  });
}
