import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useServerFn } from "@tanstack/react-start";
import { addMark as addMarkFn, deleteMark } from "@/lib/data.functions";
import { useMarks, useMe, useSubjects } from "@/hooks/usePortal";

export const Route = createFileRoute("/_authenticated/marks")({
  head: () => ({
    meta: [
      { title: "Marks — Campus Portal" },
      {
        name: "description",
        content: "Add and review internal and semester marks for each subject.",
      },
      { property: "og:title", content: "Marks — Campus Portal" },
      { property: "og:description", content: "Subject-wise marks you or your admin recorded." },
    ],
  }),
  component: MarksPage,
});

function MarksPage() {
  const { data: me } = useMe();
  const studentId = me?.profile?.id;
  const { data: subjects = [] } = useSubjects();
  const { data: marks = [] } = useMarks(studentId);
  const queryClient = useQueryClient();

  const [subjectId, setSubjectId] = useState("");
  const [examName, setExamName] = useState("Internal 1");
  const [obtained, setObtained] = useState("");
  const [max, setMax] = useState("100");

  const addMarkServerFn = useServerFn(addMarkFn);
  const deleteMarkFn = useServerFn(deleteMark);

  const addMark = useMutation({
    mutationFn: async () => {
      const subject = subjects.find((s) => s.id === subjectId);
      if (!subject) throw new Error("Choose a subject");
      await addMarkServerFn({
        data: {
          studentId: studentId!,
          subjectId: subject.id,
          subjectName: `${subject.code} · ${subject.name}`,
          examName,
          marksObtained: Number(obtained),
          maxMarks: Number(max),
        },
      });
    },
    onSuccess: () => {
      toast.success("Marks added.");
      setObtained("");
      queryClient.invalidateQueries({ queryKey: ["marks", studentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMark = useMutation({
    mutationFn: async (id: string) => {
      await deleteMarkFn({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Entry removed.");
      queryClient.invalidateQueries({ queryKey: ["marks", studentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Marks" subtitle="Add your own entries — admins can add and edit them too.">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="panel border-0 h-fit">
          <CardHeader>
            <CardTitle>Add marks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
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
              <Label>Exam</Label>
              <Select value={examName} onValueChange={setExamName}>
                <SelectTrigger>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="obtained">Scored</Label>
                <Input
                  id="obtained"
                  type="number"
                  value={obtained}
                  onChange={(e) => setObtained(e.target.value)}
                  placeholder="87"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max">Out of</Label>
                <Input
                  id="max"
                  type="number"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!subjectId || !obtained || addMark.isPending}
              onClick={() => addMark.mutate()}
            >
              Save entry
            </Button>
          </CardContent>
        </Card>

        <Card className="panel border-0">
          <CardHeader>
            <CardTitle>Your record</CardTitle>
          </CardHeader>
          <CardContent>
            {marks.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="w-[160px]">Percentage</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marks.map((m) => {
                    const pct = Math.round((Number(m.marks_obtained) / Number(m.max_marks)) * 100);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.subject_name}</TableCell>
                        <TableCell className="text-muted-foreground">{m.exam_name}</TableCell>
                        <TableCell>
                          {Number(m.marks_obtained)} / {Number(m.max_marks)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-2" />
                            <span className="w-10 text-xs text-muted-foreground">{pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete entry"
                            onClick={() => removeMark.mutate(m.id)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No marks yet. Add your first entry on the left.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
