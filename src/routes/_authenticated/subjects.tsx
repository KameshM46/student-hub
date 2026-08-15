import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NotebookPen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  useAttendance,
  useMe,
  useSubjects,
  type AttendanceRow,
  type Subject,
} from "@/hooks/usePortal";
import { percent } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects — Campus Portal" },
      {
        name: "description",
        content: "Subject notes, assignments and your subject-wise attendance.",
      },
      { property: "og:title", content: "Subjects — Campus Portal" },
      {
        property: "og:description",
        content: "Admin-published subject notes and assignments, plus attendance per subject.",
      },
    ],
  }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);
  const { data: subjects = [] } = useSubjects();
  const { data: attendance = [] } = useAttendance(isAdmin ? undefined : me?.profile?.id);
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const addSubject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("subjects")
        .insert({ code: code.trim().toUpperCase(), name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subject added.");
      setCode("");
      setName("");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Subject details"
      subtitle={
        isAdmin
          ? "Only admins can add subjects, notes and assignments — students see them instantly."
          : "Notes and assignments are published by your admin. Your attendance per subject is shown too."
      }
    >
      {isAdmin ? (
        <Card className="panel mb-6 border-0">
          <CardHeader>
            <CardTitle className="text-base">Add a subject</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CS103"
                className="w-32"
              />
            </div>
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <Label htmlFor="name">Subject name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Computer Networks"
              />
            </div>
            <Button disabled={!code || !name || addSubject.isPending} onClick={() => addSubject.mutate()}>
              Add subject
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {subjects.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            isAdmin={isAdmin}
            attendance={attendance.filter((a) => a.subject_id === subject.id)}
          />
        ))}
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No subjects yet — your admin has not added any.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}

function SubjectCard({
  subject,
  isAdmin,
  attendance,
}: {
  subject: Subject;
  isAdmin: boolean;
  attendance: AttendanceRow[];
}) {
  const [note, setNote] = useState(subject.note ?? "");
  const [assignment, setAssignment] = useState(subject.assignment ?? "");
  const queryClient = useQueryClient();

  const present = attendance.filter((a) => a.status === "present").length;
  const absent = attendance.length - present;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("subjects")
        .update({ note: note || null, assignment: assignment || null })
        .eq("id", subject.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Published to all students.");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="panel border-0">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span>{subject.name}</span>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            {subject.code}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor={`note-${subject.id}`}>Subject note</Label>
              <Textarea
                id={`note-${subject.id}`}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`assign-${subject.id}`}>Assignment</Label>
              <Textarea
                id={`assign-${subject.id}`}
                rows={3}
                value={assignment}
                onChange={(e) => setAssignment(e.target.value)}
                placeholder="Assignment 2 — submit by Friday"
              />
            </div>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              <NotebookPen className="mr-2 size-4" />
              Publish updates
            </Button>
          </>
        ) : (
          <>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Note</p>
              <p className="text-sm">{subject.note || "No note from the admin yet."}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Assignment</p>
              <p className="text-sm">{subject.assignment || "No assignment posted yet."}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Badge variant="secondary">
                {percent(present, attendance.length)}% attendance
              </Badge>
              <span className="text-xs text-success">{present} present</span>
              <span className="text-xs text-destructive">{absent} absent</span>
              <span className="text-xs text-muted-foreground">
                {attendance.length} class{attendance.length === 1 ? "" : "es"}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
