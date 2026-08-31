import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Search,
  FileText,
  Trash2,
  Eye,
  Upload,
  X,
  Loader2,
  UserRound,
  CalendarDays,
  HardDrive,
} from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useServerFn } from "@tanstack/react-start";

import {
  addAttendance,
  addMark as addMarkFn,
} from "@/lib/data.functions";

import {
  getAdminAmcatPdf,
  getStudentAmcatReportsForAdmin,
  deleteAmcatReportAdmin,
  uploadAmcatReportForAdmin,
} from "@/lib/portal.functions";

import {
  useAttendance,
  useMarks,
  useMe,
  useStudents,
  useSubjects,
} from "@/hooks/usePortal";

import { percent } from "@/lib/portal";

export const Route = createFileRoute(
  "/_authenticated/admin",
)({
  head: () => ({
    meta: [
      {
        title:
          "Admin — Campus Portal",
      },
      {
        name: "description",
        content:
          "Mark attendance, record marks and manage AMCAT reports.",
      },
      {
        property: "og:title",
        content:
          "Admin — Campus Portal",
      },
      {
        property:
          "og:description",
        content:
          "Attendance, marks and AMCAT administration for students.",
      },
    ],
  }),

  component: AdminPage,
});

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type SelectedAmcatStudent = {
  id: string;
  fullName: string;
  registerNo: string;
};

type AmcatReport = {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  hasPdf: boolean;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function formatFileSize(
  size: number,
) {
  if (!size) {
    return "0 KB";
  }

  if (
    size <
    1024 * 1024
  ) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    1024 /
    1024
  ).toFixed(2)} MB`;
}

function formatDate(
  value: string,
) {
  if (!value) {
    return "Unknown";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function base64ToBlob(
  base64: string,
  mimeType: string,
) {
  const binary =
    window.atob(base64);

  const bytes =
    new Uint8Array(
      binary.length,
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return new Blob(
    [bytes],
    {
      type: mimeType,
    },
  );
}

/* -------------------------------------------------------------------------- */
/* ADMIN PAGE                                                                 */
/* -------------------------------------------------------------------------- */

function AdminPage() {
  const { data: me } =
    useMe();

  const isAdmin =
    Boolean(me?.isAdmin);

  const {
    data: students = [],
  } =
    useStudents(isAdmin);

  const {
    data: subjects = [],
  } =
    useSubjects();

  const queryClient =
    useQueryClient();

  /* ======================================================================== */
  /* ATTENDANCE / MARKS                                                       */
  /* ======================================================================== */

  const [
    studentId,
    setStudentId,
  ] = useState("");

  const [
    subjectId,
    setSubjectId,
  ] = useState("");

  const [
    date,
    setDate,
  ] = useState(() =>
    new Date()
      .toISOString()
      .slice(0, 10),
  );

  const [
    status,
    setStatus,
  ] = useState("present");

  const [
    examName,
    setExamName,
  ] = useState(
    "Internal 1",
  );

  const [
    obtained,
    setObtained,
  ] = useState("");

  const [
    max,
    setMax,
  ] = useState("100");

  const {
    data: attendance = [],
  } = useAttendance(
    studentId ||
      undefined,
  );

  const {
    data: marks = [],
  } = useMarks(
    studentId ||
      undefined,
  );

  const addAttendanceFn =
    useServerFn(
      addAttendance,
    );

  const addMarkServerFn =
    useServerFn(
      addMarkFn,
    );

  const markAttendance =
    useMutation({
      mutationFn:
        async () => {
          await addAttendanceFn({
            data: {
              studentId,
              subjectId:
                subjectId ||
                null,
              date,
              status:
                status as
                  | "present"
                  | "absent",
            },
          });
        },

      onSuccess: () => {
        toast.success(
          "Attendance recorded.",
        );

        queryClient.invalidateQueries(
          {
            queryKey: [
              "attendance",
              studentId,
            ],
          },
        );
      },

      onError:
        (e: Error) =>
          toast.error(
            e.message,
          ),
    });

  const addMark =
    useMutation({
      mutationFn:
        async () => {
          const subject =
            subjects.find(
              (s) =>
                s.id ===
                subjectId,
            );

          if (!subject) {
            throw new Error(
              "Choose a subject first",
            );
          }

          await addMarkServerFn({
            data: {
              studentId,
              subjectId:
                subject.id,
              subjectName:
                `${subject.code} · ${subject.name}`,
              examName,
              marksObtained:
                Number(
                  obtained,
                ),
              maxMarks:
                Number(max),
            },
          });
        },

      onSuccess: () => {
        toast.success(
          "Marks saved.",
        );

        setObtained("");

        queryClient.invalidateQueries(
          {
            queryKey: [
              "marks",
              studentId,
            ],
          },
        );
      },

      onError:
        (e: Error) =>
          toast.error(
            e.message,
          ),
    });

  /* ======================================================================== */
  /* AMCAT MANAGEMENT                                                         */
  /* ======================================================================== */

  const [
    amcatSearch,
    setAmcatSearch,
  ] = useState("");

  const [
    selectedAmcatStudent,
    setSelectedAmcatStudent,
  ] =
    useState<SelectedAmcatStudent | null>(
      null,
    );

  const [
    amcatReports,
    setAmcatReports,
  ] = useState<
    AmcatReport[]
  >([]);

  const [
    amcatLoading,
    setAmcatLoading,
  ] = useState(false);

  const [
    amcatFile,
    setAmcatFile,
  ] = useState<File | null>(
    null,
  );

  const [
    amcatUploading,
    setAmcatUploading,
  ] = useState(false);

  const [
    deletingReportId,
    setDeletingReportId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    openingReportId,
    setOpeningReportId,
  ] =
    useState<string | null>(
      null,
    );

  const filteredStudents =
    useMemo(() => {
      const query =
        amcatSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return [];
      }

      return students
        .filter(
          (student) =>
            student.full_name
              .toLowerCase()
              .includes(query) ||
            student.register_no
              .toLowerCase()
              .includes(query),
        )
        .slice(0, 10);
    }, [
      students,
      amcatSearch,
    ]);

  /* ------------------------------------------------------------------------ */
  /* SELECT STUDENT                                                          */
  /* ------------------------------------------------------------------------ */

  async function selectAmcatStudent(
    student: {
      id: string;
      full_name: string;
      register_no: string;
    },
  ) {
    const selected: SelectedAmcatStudent =
      {
        id: student.id,
        fullName:
          student.full_name,
        registerNo:
          student.register_no,
      };

    setSelectedAmcatStudent(
      selected,
    );

    setAmcatSearch(
      student.full_name,
    );

    setAmcatReports([]);

    setAmcatLoading(true);

    try {
      const result =
        await getStudentAmcatReportsForAdmin(
          {
            data: {
              studentId:
                student.id,
            },
          },
        );

      if (!result.ok) {
        throw new Error(
          result.error,
        );
      }

      setAmcatReports(
        result.reports as AmcatReport[],
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load reports.",
      );
    } finally {
      setAmcatLoading(
        false,
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* CLEAR STUDENT                                                            */
  /* ------------------------------------------------------------------------ */

  function clearAmcatStudent() {
    setSelectedAmcatStudent(
      null,
    );

    setAmcatSearch("");
    setAmcatReports([]);
    setAmcatFile(null);
    setAmcatLoading(false);
  }

  /* ------------------------------------------------------------------------ */
  /* FILE SELECTION                                                            */
  /* ------------------------------------------------------------------------ */

  function handleAmcatFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selected =
      event.target.files?.[0];

    if (!selected) {
      return;
    }

    if (
      selected.type !==
      "application/pdf"
    ) {
      toast.error(
        "Please select a PDF file.",
      );

      event.target.value =
        "";

      return;
    }

    if (
      selected.size >
      10 * 1024 * 1024
    ) {
      toast.error(
        "PDF must be smaller than 10 MB.",
      );

      event.target.value =
        "";

      return;
    }

    setAmcatFile(
      selected,
    );
  }

  /* ------------------------------------------------------------------------ */
  /* ADMIN ADD REPORT                                                         */
  /* ------------------------------------------------------------------------ */

  async function addAdminAmcatReport() {
    if (
      !amcatFile ||
      !selectedAmcatStudent
    ) {
      toast.error(
        "Select a student and PDF first.",
      );

      return;
    }

    setAmcatUploading(
      true,
    );

    try {
      const arrayBuffer =
        await amcatFile.arrayBuffer();

      const bytes =
        new Uint8Array(
          arrayBuffer,
        );

      let binary = "";

      const chunkSize =
        0x8000;

      for (
        let i = 0;
        i < bytes.length;
        i += chunkSize
      ) {
        const chunk =
          bytes.subarray(
            i,
            Math.min(
              i +
                chunkSize,
              bytes.length,
            ),
          );

        binary +=
          String.fromCharCode(
            ...chunk,
          );
      }

      const fileBase64 =
        window.btoa(
          binary,
        );

      const result =
        await uploadAmcatReportForAdmin(
          {
            data: {
              studentId:
                selectedAmcatStudent.id,

              fileName:
                amcatFile.name,

              fileType:
                "application/pdf",

              fileBase64,
            },
          },
        );

      if (!result.ok) {
        throw new Error(
          result.error,
        );
      }

      toast.success(
        "AMCAT report added successfully.",
      );

      setAmcatFile(null);

      await reloadSelectedAmcatReports();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to add AMCAT report.",
      );
    } finally {
      setAmcatUploading(
        false,
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* RELOAD REPORTS                                                           */
  /* ------------------------------------------------------------------------ */

  async function reloadSelectedAmcatReports() {
    if (
      !selectedAmcatStudent
    ) {
      return;
    }

    const result =
      await getStudentAmcatReportsForAdmin(
        {
          data: {
            studentId:
              selectedAmcatStudent.id,
          },
        },
      );

    if (result.ok) {
      setAmcatReports(
        result.reports as AmcatReport[],
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* VIEW REPORT                                                              */
  /* ------------------------------------------------------------------------ */

  async function viewAdminReport(
    report: AmcatReport,
  ) {
    const newWindow =
      window.open(
        "about:blank",
        "_blank",
      );

    if (!newWindow) {
      toast.error(
        "Please allow pop-ups for this portal.",
      );

      return;
    }

    setOpeningReportId(
      report.id,
    );

    try {
      const result =
        await getAdminAmcatPdf(
          {
            data: {
              reportId:
                report.id,
            },
          },
        );

      if (!result.ok) {
        newWindow.close();

        throw new Error(
          result.error,
        );
      }

      const blob =
        base64ToBlob(
          result.fileBase64,
          result.mimeType,
        );

      const url =
        URL.createObjectURL(
          blob,
        );

      newWindow.location.href =
        url;

      window.setTimeout(
        () => {
          URL.revokeObjectURL(
            url,
          );
        },
        60_000,
      );
    } catch (error) {
      console.error(
        "View AMCAT error:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to open PDF.",
      );

      try {
        newWindow.close();
      } catch {
        // Ignore.
      }
    } finally {
      setOpeningReportId(
        null,
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* DELETE REPORT                                                            */
  /* ------------------------------------------------------------------------ */

  async function deleteReport(
    report: AmcatReport,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${report.fileName}"?\n\nThis action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingReportId(
      report.id,
    );

    try {
      const result =
        await deleteAmcatReportAdmin(
          {
            data: {
              reportId:
                report.id,
            },
          },
        );

      if (!result.ok) {
        throw new Error(
          result.error,
        );
      }

      setAmcatReports(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              report.id,
          ),
      );

      toast.success(
        "AMCAT report deleted.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete report.",
      );
    } finally {
      setDeletingReportId(
        null,
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ACCESS CHECK                                                              */
  /* ------------------------------------------------------------------------ */

  if (!isAdmin) {
    return (
      <AppShell
        title="Admin"
        subtitle="Restricted area"
      >
        <Card className="panel border-0">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            This page is only available to admin accounts.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const present =
    attendance.filter(
      (a) =>
        a.status ===
        "present",
    ).length;

  /* ======================================================================== */
  /* UI                                                                       */
  /* ======================================================================== */

  return (
    <AppShell
      title="Admin console"
      subtitle="Manage students, attendance, marks and AMCAT reports."
    >
      <div className="space-y-6">
        {/* ================================================================== */}
        {/* AMCAT MANAGEMENT                                                    */}
        {/* ================================================================== */}

        <Card className="panel border-0">
          <CardHeader>
            <CardTitle className="text-base">
              AMCAT Management
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* SEARCH */}
            <div>
              <Label
                htmlFor="amcat-search"
                className="mb-2 block"
              >
                Search student
              </Label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    id="amcat-search"
                    value={
                      amcatSearch
                    }
                    onChange={(e) =>
                      setAmcatSearch(
                        e.target
                          .value,
                      )
                    }
                    placeholder="Search by student name or register number..."
                    className="pl-9"
                    disabled={
                      Boolean(
                        selectedAmcatStudent,
                      )
                    }
                  />
                </div>

                {selectedAmcatStudent && (
                  <Button
                    variant="outline"
                    onClick={
                      clearAmcatStudent
                    }
                  >
                    <X className="mr-2 size-4" />
                    Clear
                  </Button>
                )}
              </div>

              {/* SEARCH RESULTS */}
              {!selectedAmcatStudent &&
                amcatSearch.trim() && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-border bg-background shadow-md">
                    {filteredStudents.length >
                    0 ? (
                      filteredStudents.map(
                        (student) => (
                          <button
                            key={
                              student.id
                            }
                            type="button"
                            onClick={() =>
                              void selectAmcatStudent(
                                student,
                              )
                            }
                            className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-accent"
                          >
                            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
                              <UserRound className="size-4 text-primary" />
                            </div>

                            <div>
                              <p className="font-medium">
                                {
                                  student.full_name
                                }
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {
                                  student.register_no
                                }
                              </p>
                            </div>
                          </button>
                        ),
                      )
                    ) : (
                      <div className="px-4 py-5 text-center text-sm text-muted-foreground">
                        No students found.
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* SELECTED STUDENT */}
            {selectedAmcatStudent && (
              <>
                <div className="rounded-2xl border border-border bg-muted/20 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
                        <UserRound className="size-5 text-primary" />
                      </div>

                      <div>
                        <p className="font-semibold">
                          {
                            selectedAmcatStudent.fullName
                          }
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Register No:{" "}
                          {
                            selectedAmcatStudent.registerNo
                          }
                        </p>
                      </div>
                    </div>

                    <Badge variant="secondary">
                      {
                        amcatReports.length
                      }{" "}
                      report
                      {amcatReports.length !==
                      1
                        ? "s"
                        : ""}
                    </Badge>
                  </div>
                </div>

                {/* REPORTS */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">
                      Uploaded AMCAT Reports
                    </h3>
                  </div>

                  {amcatLoading ? (
                    <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 size-5 animate-spin" />
                      Loading reports...
                    </div>
                  ) : amcatReports.length ===
                    0 ? (
                    <div className="rounded-2xl border border-dashed border-border py-10 text-center">
                      <FileText className="mx-auto size-9 text-muted-foreground" />

                      <h3 className="mt-3 font-semibold">
                        No AMCAT reports
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        This student has no AMCAT report uploaded yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {amcatReports.map(
                        (report) => (
                          <div
                            key={
                              report.id
                            }
                            className="flex flex-col gap-4 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                <FileText className="size-5 text-primary" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {
                                    report.fileName
                                  }
                                </p>

                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <CalendarDays className="size-3.5" />
                                    {formatDate(
                                      report.uploadedAt,
                                    )}
                                  </span>

                                  <span className="flex items-center gap-1">
                                    <HardDrive className="size-3.5" />
                                    {formatFileSize(
                                      report.fileSize,
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 gap-2">
                              <Button
                                variant="outline"
                                disabled={
                                  !report.hasPdf ||
                                  openingReportId ===
                                    report.id
                                }
                                onClick={() =>
                                  void viewAdminReport(
                                    report,
                                  )
                                }
                              >
                                {openingReportId ===
                                report.id ? (
                                  <Loader2 className="mr-2 size-4 animate-spin" />
                                ) : (
                                  <Eye className="mr-2 size-4" />
                                )}

                                View
                              </Button>

                              <Button
                                variant="destructive"
                                disabled={
                                  deletingReportId ===
                                  report.id
                                }
                                onClick={() =>
                                  void deleteReport(
                                    report,
                                  )
                                }
                              >
                                {deletingReportId ===
                                report.id ? (
                                  <Loader2 className="mr-2 size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-2 size-4" />
                                )}

                                Delete
                              </Button>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* ADD REPORT */}
                <div className="rounded-2xl border border-border p-5">
                  <div className="mb-4">
                    <h3 className="font-semibold">
                      Add AMCAT Report
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload a report directly to this student's account.
                    </p>
                  </div>

                  {!amcatFile ? (
                    <label
                      htmlFor="admin-amcat-upload"
                      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:bg-accent/30"
                    >
                      <Upload className="mb-3 size-8 text-primary" />

                      <p className="font-medium">
                        Choose AMCAT PDF
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        PDF only • Maximum 10 MB
                      </p>

                      <input
                        id="admin-amcat-upload"
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={
                          handleAmcatFileChange
                        }
                        disabled={
                          amcatUploading
                        }
                      />
                    </label>
                  ) : (
                    <div className="rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <FileText className="size-7 shrink-0 text-primary" />

                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {
                                amcatFile.name
                              }
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(
                                amcatFile.size,
                              )}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={
                            amcatUploading
                          }
                          onClick={() =>
                            setAmcatFile(
                              null,
                            )
                          }
                        >
                          <X className="size-4" />
                        </Button>
                      </div>

                      <Button
                        className="mt-4 w-full"
                        disabled={
                          amcatUploading
                        }
                        onClick={() =>
                          void addAdminAmcatReport()
                        }
                      >
                        {amcatUploading ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 size-4" />
                            Add Report for{" "}
                            {
                              selectedAmcatStudent.fullName
                            }
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ================================================================== */}
        {/* ATTENDANCE                                                         */}
        {/* ================================================================== */}

        <Card className="panel border-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-3 text-base">
              Attendance

              {studentId ? (
                <Badge variant="secondary">
                  {percent(
                    present,
                    attendance.length,
                  )}
                  % · {present} present /{" "}
                  {attendance.length -
                    present}{" "}
                  absent
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">
                Date
              </Label>

              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(
                    e.target.value,
                  )
                }
                className="w-40"
              />
            </div>

            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label>
                Subject (optional)
              </Label>

              <Select
                value={subjectId}
                onValueChange={
                  setSubjectId
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any subject" />
                </SelectTrigger>

                <SelectContent>
                  {subjects.map(
                    (s) => (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                      >
                        {s.code} ·{" "}
                        {s.name}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Status
              </Label>

              <Select
                value={status}
                onValueChange={
                  setStatus
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="present">
                    Present
                  </SelectItem>

                  <SelectItem value="absent">
                    Absent
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              disabled={
                !studentId ||
                markAttendance.isPending
              }
              onClick={() =>
                markAttendance.mutate()
              }
            >
              Record
            </Button>
          </CardContent>
        </Card>

        {/* ================================================================== */}
        {/* ADD MARKS                                                          */}
        {/* ================================================================== */}

        <Card className="panel border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Add marks
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>
                Exam
              </Label>

              <Select
                value={examName}
                onValueChange={
                  setExamName
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {[
                    "Internal 1",
                    "Internal 2",
                    "Internal 3",
                    "Model exam",
                    "Semester",
                  ].map(
                    (e) => (
                      <SelectItem
                        key={e}
                        value={e}
                      >
                        {e}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scored">
                Scored
              </Label>

              <Input
                id="scored"
                type="number"
                className="w-28"
                value={obtained}
                onChange={(e) =>
                  setObtained(
                    e.target.value,
                  )
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="outof">
                Out of
              </Label>

              <Input
                id="outof"
                type="number"
                className="w-28"
                value={max}
                onChange={(e) =>
                  setMax(
                    e.target.value,
                  )
                }
              />
            </div>

            <Button
              disabled={
                !studentId ||
                !subjectId ||
                !obtained ||
                addMark.isPending
              }
              onClick={() =>
                addMark.mutate()
              }
            >
              Save marks
            </Button>
          </CardContent>
        </Card>

        {/* ================================================================== */}
        {/* RECENT ENTRIES                                                      */}
        {/* ================================================================== */}

        <Card className="panel border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Recent entries
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Attendance
              </p>

              <ul className="space-y-1 text-sm">
                {attendance
                  .slice(0, 6)
                  .map(
                    (a) => (
                      <li
                        key={a.id}
                        className="flex justify-between gap-3"
                      >
                        <span>
                          {a.date}
                        </span>

                        <span
                          className={
                            a.status ===
                            "present"
                              ? "text-success"
                              : "text-destructive"
                          }
                        >
                          {
                            a.status
                          }
                        </span>
                      </li>
                    ),
                  )}

                {attendance.length ===
                0 ? (
                  <li className="text-muted-foreground">
                    Nothing yet.
                  </li>
                ) : null}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Marks
              </p>

              <ul className="space-y-1 text-sm">
                {marks
                  .slice(0, 6)
                  .map(
                    (m) => (
                      <li
                        key={m.id}
                        className="flex justify-between gap-3"
                      >
                        <span className="truncate">
                          {
                            m.subject_name
                          }
                        </span>

                        <span className="text-muted-foreground">
                          {
                            Number(
                              m.marks_obtained,
                            )
                          }
                          /
                          {
                            Number(
                              m.max_marks,
                            )
                          }
                        </span>
                      </li>
                    ),
                  )}

                {marks.length ===
                0 ? (
                  <li className="text-muted-foreground">
                    Nothing yet.
                  </li>
                ) : null}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}