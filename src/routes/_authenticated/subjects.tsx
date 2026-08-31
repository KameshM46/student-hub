import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  FileText,
  NotebookPen,
  Paperclip,
  X,
} from "lucide-react";
import {
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  useServerFn,
} from "@tanstack/react-start";

import {
  addSubject as addSubjectFn,
  updateSubject,
} from "@/lib/data.functions";

import {
  useAttendance,
  useMe,
  useSubjects,
  type AttendanceRow,
  type Subject,
} from "@/hooks/usePortal";

import { percent } from "@/lib/portal";

export const Route = createFileRoute(
  "/_authenticated/subjects",
)({
  head: () => ({
    meta: [
      {
        title:
          "Subjects — Campus Portal",
      },
      {
        name: "description",
        content:
          "Subject notes, assignments and attendance.",
      },
    ],
  }),

  component:
    SubjectsPage,
});

const MAX_PDF_BYTES =
  6 * 1024 * 1024;

type SubjectWithStaff =
  Subject & {
    staff_name?: string | null;
  };

function fileToDataUrl(
  file: File,
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () =>
        resolve(
          reader.result as string,
        );

      reader.onerror = () =>
        reject(
          new Error(
            "Could not read the file.",
          ),
        );

      reader.readAsDataURL(
        file,
      );
    },
  );
}

function SubjectsPage() {
  const { data: me } =
    useMe();

  const isAdmin =
    Boolean(me?.isAdmin);

  const {
    data: subjects = [],
  } =
    useSubjects();

  const {
    data: attendance = [],
  } =
    useAttendance(
      isAdmin
        ? undefined
        : me?.profile?.id,
    );

  const queryClient =
    useQueryClient();

  const [code, setCode] =
    useState("");

  const [name, setName] =
    useState("");

  const [staffName, setStaffName] =
    useState("");

  const addSubjectServerFn =
    useServerFn(
      addSubjectFn,
    );

  const addSubject =
    useMutation({
      mutationFn:
        async () => {
          if (
            !code.trim() ||
            !name.trim()
          ) {
            throw new Error(
              "Subject code and name are required.",
            );
          }

          await addSubjectServerFn({
            data: {
              code:
                code.trim(),

              name:
                name.trim(),

              staffName:
                staffName.trim() ||
                null,
            },
          });
        },

      onSuccess:
        () => {
          toast.success(
            "Subject added.",
          );

          setCode("");
          setName("");
          setStaffName("");

          queryClient.invalidateQueries(
            {
              queryKey: [
                "subjects",
              ],
            },
          );
        },

      onError:
        (error: Error) =>
          toast.error(
            error.message,
          ),
    });

  return (
    <AppShell
      title="Subject details"
      subtitle={
        isAdmin
          ? "Manage subjects, faculty names, notes and assignments."
          : "View your subjects, faculty, notes, assignments and attendance."
      }
    >
      {/* ADMIN ADD SUBJECT */}
      {isAdmin && (
        <Card className="panel mb-6 border-0">
          <CardHeader>
            <CardTitle className="text-base">
              Add a subject
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">
                Code
              </Label>

              <Input
                id="code"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target
                      .value
                      .toUpperCase(),
                  )
                }
                placeholder="CS103"
                className="w-32"
              />
            </div>

            <div className="min-w-[220px] flex-1 space-y-1.5">
              <Label htmlFor="name">
                Subject name
              </Label>

              <Input
                id="name"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target
                      .value,
                  )
                }
                placeholder="Computer Networks"
              />
            </div>

            <div className="min-w-[220px] flex-1 space-y-1.5">
              <Label htmlFor="staffName">
                Staff / Faculty Name
              </Label>

              <Input
                id="staffName"
                value={
                  staffName
                }
                onChange={(e) =>
                  setStaffName(
                    e.target
                      .value,
                  )
                }
                placeholder="Dr. Arun Kumar"
              />
            </div>

            <Button
              disabled={
                !code.trim() ||
                !name.trim() ||
                addSubject.isPending
              }
              onClick={() =>
                addSubject.mutate()
              }
            >
              Add subject
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {subjects.map(
          (subject) => (
            <SubjectCard
              key={
                subject.id
              }
              subject={
                subject as SubjectWithStaff
              }
              isAdmin={
                isAdmin
              }
              attendance={attendance.filter(
                (item) =>
                  item.subject_id ===
                  subject.id,
              )}
            />
          ),
        )}

        {subjects.length ===
        0 && (
          <p className="text-sm text-muted-foreground">
            No subjects yet —
            your admin has not
            added any.
          </p>
        )}
      </div>
    </AppShell>
  );
}

function SubjectCard({
  subject,
  isAdmin,
  attendance,
}: {
  subject:
    SubjectWithStaff;

  isAdmin: boolean;

  attendance:
    AttendanceRow[];
}) {
  const [code, setCode] =
    useState(subject.code);

  const [name, setName] =
    useState(subject.name);

  const [staffName, setStaffName] =
    useState(
      subject.staff_name ??
        "",
    );

  const [note, setNote] =
    useState(
      subject.note ??
        "",
    );

  const [assignment, setAssignment] =
    useState(
      subject.assignment ??
        "",
    );

  const [
    assignmentFile,
    setAssignmentFile,
  ] = useState<
    {
      name: string;
      dataUrl: string;
    } | null | undefined
  >(undefined);

  const [uploading, setUploading] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const queryClient =
    useQueryClient();

  const updateSubjectFn =
    useServerFn(
      updateSubject,
    );

  const present =
    attendance.filter(
      (item) =>
        item.status ===
        "present",
    ).length;

  const absent =
    attendance.length -
    present;

  const currentFile =
    assignmentFile ===
    undefined
      ? subject.assignment_file
      : assignmentFile;

  const save =
    useMutation({
      mutationFn:
        async () => {
          if (
            !code.trim() ||
            !name.trim()
          ) {
            throw new Error(
              "Subject code and name can't be empty.",
            );
          }

          await updateSubjectFn({
            data: {
              id:
                subject.id,

              code:
                code.trim(),

              name:
                name.trim(),

              staffName:
                staffName.trim() ||
                null,

              note:
                note.trim() ||
                null,

              assignment:
                assignment.trim() ||
                null,

              assignmentFile,
            },
          });
        },

      onSuccess:
        () => {
          toast.success(
            "Subject updated and published.",
          );

          setAssignmentFile(
            undefined,
          );

          queryClient.invalidateQueries(
            {
              queryKey: [
                "subjects",
              ],
            },
          );
        },

      onError:
        (error: Error) =>
          toast.error(
            error.message,
          ),
    });

  async function handlePickFile(
    file: File | undefined,
  ) {
    if (!file) {
      return;
    }

    if (
      file.type !==
      "application/pdf"
    ) {
      toast.error(
        "Only PDF files can be uploaded.",
      );

      return;
    }

    if (
      file.size >
      MAX_PDF_BYTES
    ) {
      toast.error(
        "PDF is too large — please keep it under 6MB.",
      );

      return;
    }

    setUploading(true);

    try {
      const dataUrl =
        await fileToDataUrl(
          file,
        );

      setAssignmentFile({
        name: file.name,
        dataUrl,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not read the file.",
      );
    } finally {
      setUploading(false);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }
    }
  }

  return (
    <Card className="panel border-0">
      <CardHeader className="pb-2">
        {isAdmin ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div className="space-y-1.5">
                <Label
                  htmlFor={`name-${subject.id}`}
                >
                  Subject name
                </Label>

                <Input
                  id={`name-${subject.id}`}
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target
                        .value,
                    )
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={`code-${subject.id}`}
                >
                  Code
                </Label>

                <Input
                  id={`code-${subject.id}`}
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target
                        .value
                        .toUpperCase(),
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor={`staff-${subject.id}`}
              >
                Staff / Faculty Name
              </Label>

              <Input
                id={`staff-${subject.id}`}
                value={staffName}
                onChange={(e) =>
                  setStaffName(
                    e.target
                      .value,
                  )
                }
                placeholder="Dr. Arun Kumar"
              />
            </div>
          </div>
        ) : (
          <CardTitle className="text-base">
            <div className="flex items-center justify-between gap-3">
              <span>
                {subject.name}
              </span>

              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {subject.code}
              </span>
            </div>

            <p className="mt-2 text-sm font-normal text-muted-foreground">
              <span className="font-medium text-foreground">
                Faculty:
              </span>{" "}
              {subject.staff_name ||
                "Not assigned"}
            </p>
          </CardTitle>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {isAdmin ? (
          <>
            <div className="space-y-1.5">
              <Label
                htmlFor={`note-${subject.id}`}
              >
                Subject note
              </Label>

              <Textarea
                id={`note-${subject.id}`}
                rows={3}
                value={note}
                onChange={(e) =>
                  setNote(
                    e.target
                      .value,
                  )
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor={`assign-${subject.id}`}
              >
                Assignment
              </Label>

              <Textarea
                id={`assign-${subject.id}`}
                rows={3}
                value={assignment}
                onChange={(e) =>
                  setAssignment(
                    e.target
                      .value,
                  )
                }
                placeholder="Assignment 2 — submit by Friday"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Assignment PDF
              </Label>

              {currentFile ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />

                    <span className="truncate">
                      {
                        currentFile.name
                      }
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setAssignmentFile(
                        null,
                      )
                    }
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Remove PDF"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No PDF uploaded yet.
                </p>
              )}

              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) =>
                  void handlePickFile(
                    event.target.files?.[0],
                  )
                }
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  uploading
                }
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                <Paperclip className="mr-2 size-4" />

                {uploading
                  ? "Reading file…"
                  : currentFile
                    ? "Replace PDF"
                    : "Upload PDF"}
              </Button>
            </div>

            <Button
              size="sm"
              onClick={() =>
                save.mutate()
              }
              disabled={
                save.isPending
              }
            >
              <NotebookPen className="mr-2 size-4" />

              {save.isPending
                ? "Publishing…"
                : "Publish updates"}
            </Button>
          </>
        ) : (
          <>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Note
              </p>

              <p className="text-sm">
                {subject.note ||
                  "No note from the admin yet."}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Assignment
              </p>

              <p className="text-sm">
                {subject.assignment ||
                  "No assignment posted yet."}
              </p>

              {subject.assignment_file && (
                <a
                  href={
                    subject
                      .assignment_file
                      .dataUrl
                  }
                  download={
                    subject
                      .assignment_file
                      .name
                  }
                  className="mt-2 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-sm text-primary hover:bg-accent"
                >
                  <FileText className="size-4" />

                  {
                    subject
                      .assignment_file
                      .name
                  }
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Badge variant="secondary">
                {percent(
                  present,
                  attendance.length,
                )}
                % attendance
              </Badge>

              <span className="text-xs text-success">
                {present} present
              </span>

              <span className="text-xs text-destructive">
                {absent} absent
              </span>

              <span className="text-xs text-muted-foreground">
                {
                  attendance.length
                }{" "}
                class
                {attendance.length ===
                1
                  ? ""
                  : "es"}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}