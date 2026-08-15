import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NotebookPen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useMe, useSubjects, type Subject } from "@/hooks/usePortal";

export const Route = createFileRoute("/_authenticated/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects — Campus Portal" },
      {
        name: "description",
        content: "Subject details and the latest notes published by the admin.",
      },
      { property: "og:title", content: "Subjects — Campus Portal" },
      { property: "og:description", content: "Subject codes, names and admin notes for everyone." },
    ],
  }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);
  const { data: subjects = [] } = useSubjects();
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
          ? "Update a note and every student sees it instantly."
          : "Notes here are published by your admin for all students."
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
          <SubjectCard key={subject.id} subject={subject} isAdmin={isAdmin} />
        ))}
      </div>
    </AppShell>
  );
}

function SubjectCard({ subject, isAdmin }: { subject: Subject; isAdmin: boolean }) {
  const [note, setNote] = useState(subject.note ?? "");
  const queryClient = useQueryClient();

  const saveNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("subjects")
        .update({ note: note || null })
        .eq("id", subject.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note published to all students.");
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
      <CardContent className="space-y-3">
        {isAdmin ? (
          <>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" onClick={() => saveNote.mutate()} disabled={saveNote.isPending}>
              <NotebookPen className="mr-2 size-4" />
              Update note
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {subject.note || "No note from the admin yet."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
