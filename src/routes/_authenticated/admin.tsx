import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerFn } from "@tanstack/react-start";
import { addAttendance, addMark as addMarkFn } from "@/lib/data.functions";
import { useAttendance, useMarks, useMe, useStudents, useSubjects } from "@/hooks/usePortal";
import { percent } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Campus Portal" },
      {
        name: "description",
        content: "Mark attendance, record marks and review every student's record.",
      },
      { property: "og:title", content: "Admin — Campus Portal" },
      { property: "og:description", content: "Attendance and marks administration for students." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);
  const { data: students = [] } = useStudents(isAdmin);
  const { data: subjects = [] } = useSubjects();
  const queryClient = useQueryClient();

  const [studentId, setStudentId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("present");
  const [examName, setExamName] = useState("Internal 1");
  const [obtained, setObtained] = useState("");
  const [max, setMax] = useState("100");

  const { data: attendance = [] } = useAttendance(studentId || undefined);
  const { data: marks = [] } = useMarks(studentId || undefined);

  const addAttendanceFn = useServerFn(addAttendance);
  const addMarkServerFn = useServerFn(addMarkFn);

  const markAttendance = useMutation({
    mutationFn: async () => {
      await addAttendanceFn({
        data: { studentId, subjectId: subjectId || null, date, status: status as "present" | "absent" },
      });
    },
    onSuccess: () => {
      toast.success("Attendance recorded.");
      queryClient.invalidateQueries({ queryKey: ["attendance", studentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMark = useMutation({
    mutationFn: async () => {
      const subject = subjects.find((s) => s.id === subjectId);
      if (!subject) throw new Error("Choose a subject first");
      await addMarkServerFn({
        data: {
          studentId,
          subjectId: subject.id,
          subjectName: `${subject.code} · ${subject.name}`,
          examName,
          marksObtained: Number(obtained),
          maxMarks: Number(max),
        },
      });
    },
    onSuccess: () => {
      toast.success("Marks saved.");
      setObtained("");
      queryClient.invalidateQueries({ queryKey: ["marks", studentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <AppShell title="Admin" subtitle="Restricted area">
        <Card className="panel border-0">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            This page is only available to admin accounts.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const present = attendance.filter((a) => a.status === "present").length;

  return (
    <AppShell title="Admin console" subtitle="Mark attendance and record marks for any student.">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="panel border-0 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Students ({students.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {students.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStudentId(s.id)}
                className={`w-full rounded-xl border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                  studentId === s.id ? "bg-accent text-accent-foreground" : ""
                }`}
              >
                <span className="block font-medium">{s.full_name}</span>
                <span className="text-xs text-muted-foreground">{s.register_no}</span>
              </button>
            ))}
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students registered yet.</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="panel border-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center gap-3 text-base">
                Attendance
                {studentId ? (
                  <Badge variant="secondary">
                    {percent(present, attendance.length)}% · {present} present /{" "}
                    {attendance.length - present} absent
                  </Badge>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="min-w-[200px] flex-1 space-y-1.5">
                <Label>Subject (optional)</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} · {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={!studentId || markAttendance.isPending}
                onClick={() => markAttendance.mutate()}
              >
                Record
              </Button>
            </CardContent>
          </Card>

          <Card className="panel border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Add marks</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Exam</Label>
                <Select value={examName} onValueChange={setExamName}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Internal 1", "Internal 2", "Internal 3", "Model exam", "Semester"].map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scored">Scored</Label>
                <Input
                  id="scored"
                  type="number"
                  className="w-28"
                  value={obtained}
                  onChange={(e) => setObtained(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="outof">Out of</Label>
                <Input
                  id="outof"
                  type="number"
                  className="w-28"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                />
              </div>
              <Button
                disabled={!studentId || !subjectId || !obtained || addMark.isPending}
                onClick={() => addMark.mutate()}
              >
                Save marks
              </Button>
            </CardContent>
          </Card>

          <Card className="panel border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent entries</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Attendance
                </p>
                <ul className="space-y-1 text-sm">
                  {attendance.slice(0, 6).map((a) => (
                    <li key={a.id} className="flex justify-between gap-3">
                      <span>{a.date}</span>
                      <span
                        className={
                          a.status === "present" ? "text-success" : "text-destructive"
                        }
                      >
                        {a.status}
                      </span>
                    </li>
                  ))}
                  {attendance.length === 0 ? (
                    <li className="text-muted-foreground">Nothing yet.</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Marks</p>
                <ul className="space-y-1 text-sm">
                  {marks.slice(0, 6).map((m) => (
                    <li key={m.id} className="flex justify-between gap-3">
                      <span className="truncate">{m.subject_name}</span>
                      <span className="text-muted-foreground">
                        {Number(m.marks_obtained)}/{Number(m.max_marks)}
                      </span>
                    </li>
                  ))}
                  {marks.length === 0 ? (
                    <li className="text-muted-foreground">Nothing yet.</li>
                  ) : null}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
