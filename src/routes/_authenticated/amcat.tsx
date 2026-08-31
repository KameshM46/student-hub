import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FileUp,
  FileText,
  X,
  Loader2,
  Eye,
  CalendarDays,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  Upload,
  Search,
  UserRound,
  Trash2,
  UserCheck,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { useStudents } from "@/hooks/usePortal";

import {
  getAmcatPdf,
  getAdminAmcatPdf,
  getMe,
  getMyAmcatReports,
  getStudentAmcatReportsForAdmin,
  uploadAmcatReport,
  uploadAmcatReportForAdmin,
  deleteAmcatReportAdmin,
} from "@/lib/portal.functions";

export const Route = createFileRoute(
  "/_authenticated/amcat",
)({
  component: AMCAT,
});

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AmcatReport = {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  hasPdf: boolean;
};

type AdminReport = AmcatReport & {
  studentId: string;
  studentName: string;
  registerNo: string;
};

type SelectedStudent = {
  id: string;
  fullName: string;
  registerNo: string;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function formatFileSize(size: number) {
  if (!size) {
    return "0 KB";
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(value: string) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function convertBase64ToBlob(
  base64: string,
  mimeType: string,
) {
  const binaryString = window.atob(base64);

  const bytes = new Uint8Array(
    binaryString.length,
  );

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] =
      binaryString.charCodeAt(i);
  }

  return new Blob([bytes], {
    type: mimeType,
  });
}

async function fileToBase64(file: File) {
  const arrayBuffer = await file.arrayBuffer();

  const bytes = new Uint8Array(arrayBuffer);

  let binary = "";

  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {
    const chunk = bytes.subarray(
      i,
      Math.min(i + chunkSize, bytes.length),
    );

    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

function AMCAT() {
  /* ======================================================================== */
  /* CURRENT USER                                                             */
  /* ======================================================================== */

  const [isAdmin, setIsAdmin] = useState(false);

  const [checkingUser, setCheckingUser] =
    useState(true);

  /* ======================================================================== */
  /* STUDENT REPORTS                                                          */
  /* ======================================================================== */

  const [studentReports, setStudentReports] =
    useState<AmcatReport[]>([]);

  /* ======================================================================== */
  /* ADMIN STUDENT SEARCH                                                     */
  /* ======================================================================== */

  const {
    data: students = [],
  } = useStudents(isAdmin);

  const [search, setSearch] = useState("");

  const [
    selectedStudent,
    setSelectedStudent,
  ] = useState<SelectedStudent | null>(null);

  const [adminReports, setAdminReports] =
    useState<AdminReport[]>([]);

  const [loadingStudentReports, setLoadingStudentReports] =
    useState(false);

  /* ======================================================================== */
  /* UPLOAD                                                                   */
  /* ======================================================================== */

  const [file, setFile] =
    useState<File | null>(null);

  const [adminFile, setAdminFile] =
    useState<File | null>(null);

  const [uploading, setUploading] =
    useState(false);

  const [adminUploading, setAdminUploading] =
    useState(false);

  /* ======================================================================== */
  /* VIEW / DELETE                                                            */
  /* ======================================================================== */

  const [openingReportId, setOpeningReportId] =
    useState<string | null>(null);

  const [deletingReportId, setDeletingReportId] =
    useState<string | null>(null);

  /* ======================================================================== */
  /* UI STATE                                                                 */
  /* ======================================================================== */

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  /* ======================================================================== */
  /* CHECK LOGIN / ROLE                                                       */
  /* ======================================================================== */

  useEffect(() => {
    async function loadUser() {
      setCheckingUser(true);

      try {
        const me = await getMe();

        if (!me.user) {
          setError(
            "You must be logged in.",
          );
          return;
        }

        setIsAdmin(me.isAdmin);

        /*
         * Admins search for students, so we do not load every report here.
         *
         * Students load only their own reports.
         */
        if (!me.isAdmin) {
          const result =
            await getMyAmcatReports();

          if (!result.ok) {
            setError(result.error);
            return;
          }

          setStudentReports(
            result.reports as AmcatReport[],
          );
        }
      } catch (loadError) {
        console.error(
          "AMCAT page load error:",
          loadError,
        );

        setError(
          "Failed to load AMCAT information.",
        );
      } finally {
        setLoading(false);
        setCheckingUser(false);
      }
    }

    void loadUser();
  }, []);

  /* ======================================================================== */
  /* ADMIN SEARCH RESULTS                                                     */
  /* ======================================================================== */

  const searchResults = useMemo(() => {
    if (!isAdmin) {
      return [];
    }

    const query =
      search.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return students
      .filter((student) => {
        const name =
          student.full_name.toLowerCase();

        const registerNo =
          student.register_no.toLowerCase();

        return (
          name.includes(query) ||
          registerNo.includes(query)
        );
      })
      .slice(0, 10);
  }, [students, search, isAdmin]);

  /* ======================================================================== */
  /* ADMIN SELECT STUDENT                                                     */
  /* ======================================================================== */

  async function selectStudent(student: {
    id: string;
    full_name: string;
    register_no: string;
  }) {
    const selected: SelectedStudent = {
      id: student.id,
      fullName: student.full_name,
      registerNo: student.register_no,
    };

    setSelectedStudent(selected);

    setSearch(student.full_name);

    setAdminReports([]);

    setLoadingStudentReports(true);

    setError(null);

    try {
      const result =
        await getStudentAmcatReportsForAdmin({
          data: {
            studentId: student.id,
          },
        });

      if (!result.ok) {
        throw new Error(result.error);
      }

      const reports =
        result.reports.map((report) => ({
          ...report,
          studentId: student.id,
          studentName: student.full_name,
          registerNo: student.register_no,
        }));

      setAdminReports(
        reports as AdminReport[],
      );
    } catch (loadError) {
      console.error(
        "Admin AMCAT student report error:",
        loadError,
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load student's reports.",
      );
    } finally {
      setLoadingStudentReports(false);
    }
  }

  /* ======================================================================== */
  /* CLEAR SELECTED STUDENT                                                   */
  /* ======================================================================== */

  function clearSelectedStudent() {
    setSelectedStudent(null);

    setSearch("");

    setAdminReports([]);

    setAdminFile(null);

    setError(null);

    setSuccess(null);
  }

  /* ======================================================================== */
  /* SELECT STUDENT PDF                                                       */
  /* ======================================================================== */

  function handleStudentFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    setError(null);
    setSuccess(null);

    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.type !==
      "application/pdf"
    ) {
      setError(
        "Please select a PDF file.",
      );

      event.target.value = "";

      return;
    }

    if (
      selectedFile.size >
      10 * 1024 * 1024
    ) {
      setError(
        "PDF must be smaller than 10 MB.",
      );

      event.target.value = "";

      return;
    }

    setFile(selectedFile);
  }

  /* ======================================================================== */
  /* SELECT ADMIN PDF                                                         */
  /* ======================================================================== */

  function handleAdminFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    setError(null);

    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.type !==
      "application/pdf"
    ) {
      setError(
        "Please select a PDF file.",
      );

      event.target.value = "";

      return;
    }

    if (
      selectedFile.size >
      10 * 1024 * 1024
    ) {
      setError(
        "PDF must be smaller than 10 MB.",
      );

      event.target.value = "";

      return;
    }

    setAdminFile(selectedFile);
  }

  /* ======================================================================== */
  /* STUDENT UPLOAD                                                           */
  /* ======================================================================== */

  async function uploadStudentReport() {
    if (!file || uploading) {
      return;
    }

    setUploading(true);

    setError(null);

    setSuccess(null);

    try {
      const fileBase64 =
        await fileToBase64(file);

      const result =
        await uploadAmcatReport({
          data: {
            fileName: file.name,
            fileType: "application/pdf",
            fileBase64,
          },
        });

      if (!result.ok) {
        throw new Error(result.error);
      }

      setSuccess(
        `${file.name} uploaded successfully.`,
      );

      setFile(null);

      const refreshed =
        await getMyAmcatReports();

      if (refreshed.ok) {
        setStudentReports(
          refreshed.reports as AmcatReport[],
        );
      }
    } catch (uploadError) {
      console.error(
        "Student AMCAT upload error:",
        uploadError,
      );

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload AMCAT report.",
      );
    } finally {
      setUploading(false);
    }
  }

  /* ======================================================================== */
  /* ADMIN UPLOAD FOR SELECTED STUDENT                                        */
  /* ======================================================================== */

  async function uploadAdminReport() {
    if (
      !adminFile ||
      !selectedStudent ||
      adminUploading
    ) {
      return;
    }

    setAdminUploading(true);

    setError(null);

    setSuccess(null);

    try {
      const fileBase64 =
        await fileToBase64(adminFile);

      const result =
        await uploadAmcatReportForAdmin({
          data: {
            studentId:
              selectedStudent.id,

            fileName:
              adminFile.name,

            fileType:
              "application/pdf",

            fileBase64,
          },
        });

      if (!result.ok) {
        throw new Error(result.error);
      }

      setSuccess(
        `${adminFile.name} added to ${selectedStudent.fullName}.`,
      );

      setAdminFile(null);

      await reloadAdminStudentReports();
    } catch (uploadError) {
      console.error(
        "Admin AMCAT upload error:",
        uploadError,
      );

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to add AMCAT report.",
      );
    } finally {
      setAdminUploading(false);
    }
  }

  /* ======================================================================== */
  /* RELOAD ADMIN STUDENT REPORTS                                             */
  /* ======================================================================== */

  async function reloadAdminStudentReports() {
    if (!selectedStudent) {
      return;
    }

    setLoadingStudentReports(true);

    try {
      const result =
        await getStudentAmcatReportsForAdmin({
          data: {
            studentId:
              selectedStudent.id,
          },
        });

      if (!result.ok) {
        throw new Error(result.error);
      }

      const reports =
        result.reports.map((report) => ({
          ...report,
          studentId:
            selectedStudent.id,
          studentName:
            selectedStudent.fullName,
          registerNo:
            selectedStudent.registerNo,
        }));

      setAdminReports(
        reports as AdminReport[],
      );
    } catch (loadError) {
      console.error(
        "Reload AMCAT reports error:",
        loadError,
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to refresh reports.",
      );
    } finally {
      setLoadingStudentReports(false);
    }
  }

  /* ======================================================================== */
  /* VIEW STUDENT REPORT                                                      */
  /* ======================================================================== */

  async function viewStudentReport(
    report: AmcatReport,
  ) {
    const newWindow =
      window.open(
        "about:blank",
        "_blank",
      );

    if (!newWindow) {
      setError(
        "Please allow pop-ups for this portal.",
      );

      return;
    }

    setOpeningReportId(report.id);

    setError(null);

    try {
      const result =
        await getAmcatPdf({
          data: {
            reportId: report.id,
          },
        });

      if (!result.ok) {
        newWindow.close();

        throw new Error(result.error);
      }

      const blob =
        convertBase64ToBlob(
          result.fileBase64,
          result.mimeType,
        );

      const url =
        URL.createObjectURL(blob);

      newWindow.location.href =
        url;

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60_000);
    } catch (viewError) {
      console.error(
        "View student AMCAT report error:",
        viewError,
      );

      setError(
        viewError instanceof Error
          ? viewError.message
          : "Failed to open AMCAT report.",
      );

      try {
        newWindow.close();
      } catch {
        // Ignore.
      }
    } finally {
      setOpeningReportId(null);
    }
  }

  /* ======================================================================== */
  /* VIEW ADMIN REPORT                                                        */
  /* ======================================================================== */

  async function viewAdminReport(
    report: AmcatReport,
  ) {
    const newWindow =
      window.open(
        "about:blank",
        "_blank",
      );

    if (!newWindow) {
      setError(
        "Please allow pop-ups for this portal.",
      );

      return;
    }

    setOpeningReportId(report.id);

    setError(null);

    try {
      const result =
        await getAdminAmcatPdf({
          data: {
            reportId: report.id,
          },
        });

      if (!result.ok) {
        newWindow.close();

        throw new Error(result.error);
      }

      const blob =
        convertBase64ToBlob(
          result.fileBase64,
          result.mimeType,
        );

      const url =
        URL.createObjectURL(blob);

      newWindow.location.href =
        url;

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60_000);
    } catch (viewError) {
      console.error(
        "View admin AMCAT report error:",
        viewError,
      );

      setError(
        viewError instanceof Error
          ? viewError.message
          : "Failed to open AMCAT report.",
      );

      try {
        newWindow.close();
      } catch {
        // Ignore.
      }
    } finally {
      setOpeningReportId(null);
    }
  }

  /* ======================================================================== */
  /* DELETE ADMIN REPORT                                                      */
  /* ======================================================================== */

  async function deleteAdminReport(
    report: AdminReport,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${report.fileName}"?\n\nStudent: ${report.studentName}\nRegister No: ${report.registerNo}\n\nThis action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingReportId(report.id);

    setError(null);

    try {
      const result =
        await deleteAmcatReportAdmin({
          data: {
            reportId: report.id,
          },
        });

      if (!result.ok) {
        throw new Error(result.error);
      }

      setAdminReports((current) =>
        current.filter(
          (item) =>
            item.id !== report.id,
        ),
      );

      setSuccess(
        `${report.fileName} deleted successfully.`,
      );
    } catch (deleteError) {
      console.error(
        "Delete AMCAT report error:",
        deleteError,
      );

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete AMCAT report.",
      );
    } finally {
      setDeletingReportId(null);
    }
  }

  /* ======================================================================== */
  /* LOADING                                                                  */
  /* ======================================================================== */

  if (
    loading ||
    checkingUser
  ) {
    return (
      <AppShell
        title="AMCAT"
        subtitle="AMCAT assessment reports"
      >
        <Card className="panel border-0">
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />

            <span className="ml-3 text-sm text-muted-foreground">
              Loading AMCAT...
            </span>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  /* ======================================================================== */
  /* UI                                                                       */
  /* ======================================================================== */

  return (
    <AppShell
      title="AMCAT"
      subtitle={
        isAdmin
          ? "Search students and manage their AMCAT reports."
          : "Upload and securely access your AMCAT assessment reports."
      }
    >
      <div className="mx-auto max-w-6xl space-y-6">
        {/* ================================================================== */}
        {/* NOTIFICATIONS                                                       */}
        {/* ================================================================== */}

        {error && (
          <Card className="border-destructive/30">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

              <div>
                <p className="font-medium">
                  Something went wrong
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {error}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="border-green-500/30">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="size-5 shrink-0 text-green-600" />

              <p className="text-sm font-medium text-green-600">
                {success}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ================================================================== */}
        {/* ADMIN VIEW                                                          */}
        {/* ================================================================== */}

        {isAdmin ? (
          <Card className="panel border-0">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>
                    AMCAT Report Management
                  </CardTitle>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Search for a student to view, add or delete their reports.
                  </p>
                </div>

                <Badge variant="secondary">
                  Admin
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* ---------------------------------------------------------- */}
              {/* SEARCH                                                       */}
              {/* ---------------------------------------------------------- */}

              <div>
                <label
                  htmlFor="amcat-student-search"
                  className="mb-2 block text-sm font-medium"
                >
                  Search student
                </label>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    id="amcat-student-search"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Search by student name or register number..."
                    className="pl-9"
                    disabled={
                      Boolean(
                        selectedStudent,
                      )
                    }
                  />
                </div>

                {/* SEARCH RESULTS */}
                {!selectedStudent &&
                  search.trim() && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                      {searchResults.length >
                      0 ? (
                        searchResults.map(
                          (student) => (
                            <button
                              key={
                                student.id
                              }
                              type="button"
                              onClick={() =>
                                void selectStudent(
                                  student,
                                )
                              }
                              className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent"
                            >
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <UserRound className="size-4 text-primary" />
                              </div>

                              <div className="min-w-0">
                                <p className="font-medium">
                                  {
                                    student.full_name
                                  }
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  Register No:{" "}
                                  {
                                    student.register_no
                                  }
                                </p>
                              </div>
                            </button>
                          ),
                        )
                      ) : (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No student found.
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {/* ---------------------------------------------------------- */}
              {/* SELECTED STUDENT                                             */}
              {/* ---------------------------------------------------------- */}

              {selectedStudent && (
                <>
                  <div className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                        <UserCheck className="size-6 text-primary" />
                      </div>

                      <div>
                        <p className="font-semibold">
                          {
                            selectedStudent.fullName
                          }
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Register No:{" "}
                          {
                            selectedStudent.registerNo
                          }
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={
                        clearSelectedStudent
                      }
                    >
                      <X className="mr-2 size-4" />
                      Change Student
                    </Button>
                  </div>

                  {/* -------------------------------------------------------- */}
                  {/* REPORTS                                                    */}
                  {/* -------------------------------------------------------- */}

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold">
                        AMCAT Reports
                      </h3>

                      <Badge variant="secondary">
                        {
                          adminReports.length
                        }{" "}
                        report
                        {adminReports.length !==
                        1
                          ? "s"
                          : ""}
                      </Badge>
                    </div>

                    {loadingStudentReports ? (
                      <div className="flex items-center justify-center rounded-2xl border border-border py-12">
                        <Loader2 className="size-5 animate-spin text-primary" />

                        <span className="ml-2 text-sm text-muted-foreground">
                          Loading reports...
                        </span>
                      </div>
                    ) : adminReports.length ===
                      0 ? (
                      <div className="rounded-2xl border border-dashed border-border py-12 text-center">
                        <FileText className="mx-auto size-10 text-muted-foreground" />

                        <h3 className="mt-4 font-semibold">
                          No AMCAT reports
                        </h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                          This student has not uploaded an AMCAT report.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {adminReports.map(
                          (report) => (
                            <div
                              key={
                                report.id
                              }
                              className="flex flex-col gap-4 rounded-2xl border border-border p-5 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex min-w-0 items-center gap-4">
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                  <FileText className="size-5 text-primary" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-semibold">
                                    {
                                      report.fileName
                                    }
                                  </p>

                                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
                                  onClick={() =>
                                    void viewAdminReport(
                                      report,
                                    )
                                  }
                                  disabled={
                                    openingReportId ===
                                    report.id
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
                                  onClick={() =>
                                    void deleteAdminReport(
                                      report,
                                    )
                                  }
                                  disabled={
                                    deletingReportId ===
                                    report.id
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

                  {/* -------------------------------------------------------- */}
                  {/* ADMIN ADD REPORT                                           */}
                  {/* -------------------------------------------------------- */}

                  <div className="rounded-2xl border border-border p-5">
                    <div className="mb-4">
                      <h3 className="font-semibold">
                        Add AMCAT Report
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Add a report directly to{" "}
                        {
                          selectedStudent.fullName
                        }
                        's account.
                      </p>
                    </div>

                    {!adminFile ? (
                      <label
                        htmlFor="admin-amcat-pdf"
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
                          id="admin-amcat-pdf"
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={
                            handleAdminFileChange
                          }
                          disabled={
                            adminUploading
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
                                  adminFile.name
                                }
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(
                                  adminFile.size,
                                )}
                              </p>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={
                              adminUploading
                            }
                            onClick={() =>
                              setAdminFile(
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
                            adminUploading
                          }
                          onClick={() =>
                            void uploadAdminReport()
                          }
                        >
                          {adminUploading ? (
                            <>
                              <Loader2 className="mr-2 size-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 size-4" />
                              Add Report for{" "}
                              {
                                selectedStudent.fullName
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
        ) : (
          /* ================================================================== */
          /* STUDENT VIEW                                                       */
          /* ================================================================== */

          <>
            <Card className="panel border-0">
              <CardHeader>
                <CardTitle>
                  Upload AMCAT Report
                </CardTitle>
              </CardHeader>

              <CardContent>
                {!file ? (
                  <label
                    htmlFor="student-amcat-pdf"
                    className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-12 text-center transition-colors hover:bg-accent/50"
                  >
                    <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                      <FileUp className="size-8 text-primary transition-transform group-hover:-translate-y-1" />
                    </div>

                    <h3 className="text-lg font-semibold">
                      Upload your AMCAT PDF
                    </h3>

                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      Store your original AMCAT assessment report and access it whenever you need it.
                    </p>

                    <p className="mt-3 text-xs text-muted-foreground">
                      PDF files only • Maximum 10 MB
                    </p>

                    <input
                      id="student-amcat-pdf"
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={
                        handleStudentFileChange
                      }
                      disabled={uploading}
                    />
                  </label>
                ) : (
                  <div className="rounded-2xl border border-border p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <FileText className="size-6 text-primary" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {file.name}
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatFileSize(
                              file.size,
                            )}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={
                          uploading
                        }
                        onClick={() =>
                          setFile(null)
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    </div>

                    <Button
                      className="mt-5 w-full"
                      disabled={
                        uploading
                      }
                      onClick={() =>
                        void uploadStudentReport()
                      }
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Uploading PDF...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 size-4" />
                          Upload AMCAT Report
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="panel border-0">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>
                    My AMCAT Reports
                  </CardTitle>

                  <Badge variant="secondary">
                    {
                      studentReports.length
                    }{" "}
                    report
                    {studentReports.length !==
                    1
                      ? "s"
                      : ""}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {studentReports.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed border-border py-12 text-center">
                    <FileText className="mx-auto size-10 text-muted-foreground" />

                    <h3 className="mt-4 font-semibold">
                      No AMCAT reports yet
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload your first report above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studentReports.map(
                      (report) => (
                        <div
                          key={
                            report.id
                          }
                          className="flex flex-col gap-4 rounded-2xl border border-border p-5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                              <FileText className="size-6 text-primary" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {
                                  report.fileName
                                }
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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

                                {report.hasPdf && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="size-3.5" />
                                    Stored
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            className="shrink-0"
                            disabled={
                              !report.hasPdf ||
                              openingReportId ===
                                report.id
                            }
                            onClick={() =>
                              void viewStudentReport(
                                report,
                              )
                            }
                          >
                            {openingReportId ===
                            report.id ? (
                              <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Opening...
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 size-4" />
                                View PDF
                              </>
                            )}
                          </Button>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}