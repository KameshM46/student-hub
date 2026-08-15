import { createFileRoute } from "@tanstack/react-router";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { AppShell } from "@/components/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAttendance, useMarks, useMe } from "@/hooks/usePortal";
import { percent } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Campus Portal" },
      {
        name: "description",
        content: "Your profile, attendance percentage and a present vs absent breakdown.",
      },
      { property: "og:title", content: "Dashboard — Campus Portal" },
      {
        property: "og:description",
        content: "Attendance percentage with a present vs absent pie chart.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useMe();
  const profile = me?.profile;
  const { data: attendance = [] } = useAttendance(profile?.id);
  const { data: marks = [] } = useMarks(profile?.id);

  const present = attendance.filter((a) => a.status === "present").length;
  const absent = attendance.length - present;
  const pct = percent(present, attendance.length);

  const chartData = [
    { name: "Present", value: present },
    { name: "Absent", value: absent },
  ];
  const colors = ["var(--color-success)", "var(--color-destructive)"];

  const avgMark = marks.length
    ? Math.round(
        (marks.reduce((sum, m) => sum + (Number(m.marks_obtained) / Number(m.max_marks)) * 100, 0) /
          marks.length) *
          10,
      ) / 10
    : 0;

  const initials = (profile?.full_name ?? "??")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppShell
      title={`Hello, ${profile?.full_name?.split(" ")[0] ?? "student"}`}
      subtitle="Here is your attendance and academic snapshot."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="panel border-0">
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            <Avatar className="size-28 border-2 border-primary/40 shadow-[var(--shadow-glow)]">
              {profile?.photo_url ? (
                <AvatarImage src={profile.photo_url} alt={profile.full_name} />
              ) : null}
              <AvatarFallback className="bg-secondary text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-semibold">{profile?.full_name}</h2>
              <p className="text-sm text-muted-foreground">
                Register No. {profile?.register_no}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {profile?.department ? <Badge variant="secondary">{profile.department}</Badge> : null}
              {profile?.year ? <Badge variant="secondary">Year {profile.year}</Badge> : null}
              {profile?.section ? <Badge variant="secondary">Sec {profile.section}</Badge> : null}
            </div>
            <dl className="w-full space-y-2 border-t border-border pt-4 text-left text-sm">
              <Row label="Date of birth" value={profile?.dob} />
              <Row label="Phone" value={profile?.phone} />
              <Row label="Email" value={profile?.email} />
              <Row label="Blood group" value={profile?.blood_group} />
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="panel border-0">
            <CardHeader className="pb-0">
              <CardTitle>Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-6">
                <div className="h-56 flex-1 min-w-[220px]">
                  {attendance.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={82}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {chartData.map((entry, i) => (
                            <Cell key={entry.name} fill={colors[i]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "12px",
                            color: "var(--color-foreground)",
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No attendance recorded yet.
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-5xl font-semibold text-primary">{pct}%</p>
                    <p className="text-sm text-muted-foreground">Overall attendance</p>
                  </div>
                  <Stat label="Total present" value={present} tone="success" />
                  <Stat label="Total absent" value={absent} tone="destructive" />
                  <Stat label="Classes recorded" value={attendance.length} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="panel border-0">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Average score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-semibold">{avgMark}%</p>
                <p className="text-sm text-muted-foreground">Across {marks.length} entries</p>
              </CardContent>
            </Card>
            <Card className="panel border-0">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Latest class</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold capitalize">
                  {attendance[0]?.status ?? "—"}
                </p>
                <p className="text-sm text-muted-foreground">{attendance[0]?.date ?? "No records"}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value || "—"}</dd>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "destructive";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "";
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-8 font-semibold ${toneClass}`}>{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
