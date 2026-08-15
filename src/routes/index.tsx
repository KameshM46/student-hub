import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, GraduationCap, PieChart, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Campus Portal — Student attendance & marks" },
      {
        name: "description",
        content:
          "Students sign in with their exam register number to see attendance percentage, marks and personal details.",
      },
      { property: "og:title", content: "Campus Portal — Student attendance & marks" },
      {
        property: "og:description",
        content: "Attendance pie chart, subject marks and admin notes in one student dashboard.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: PieChart,
    title: "Attendance at a glance",
    body: "A pie chart of total present versus absent days with your live percentage.",
  },
  {
    icon: GraduationCap,
    title: "Marks per subject",
    body: "Add your own internal and semester marks — admins can record them too.",
  },
  {
    icon: UserRound,
    title: "Personal details",
    body: "Keep your department, contact and guardian information up to date.",
  },
  {
    icon: CalendarCheck,
    title: "Subject notes",
    body: "Admins publish a note per subject and every student sees it instantly.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary">Campus Portal</p>
        <h1 className="mt-4 max-w-2xl font-display text-5xl leading-tight tracking-tight">
          Your <span className="text-gradient">attendance, marks</span> and student record in one
          place.
        </h1>
        <p className="mt-5 max-w-xl text-muted-foreground">
          Sign in with your exam register number and date of birth. Admins get a console for
          attendance, marks and subject notes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth" search={{}}>
              Create an account
            </Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="panel rounded-2xl p-5">
              <f.icon className="size-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
