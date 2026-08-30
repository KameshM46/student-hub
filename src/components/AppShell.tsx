import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useServerFn } from "@tanstack/react-start";
import { logoutAccount } from "@/lib/portal.functions";
import { useMe } from "@/hooks/usePortal";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/marks", label: "Marks" },
  { to: "/details", label: "My details" },
  { to: "/subjects", label: "Subjects" },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { data } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useServerFn(logoutAccount);

  const initials = (data?.profile?.full_name ?? "??")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await logout();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg font-semibold">
            <GraduationCap className="size-6 text-primary" />
            Campus Portal
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                {item.label}
              </Link>
            ))}
            {data?.isAdmin ? (
              <Link
                to="/admin"
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                Admin
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-3">
            {data?.isAdmin ? <Badge variant="secondary">Admin</Badge> : null}
            <Avatar className="size-9 border border-border">
              {data?.profile?.photo_url ? (
                <AvatarImage src={data.profile.photo_url} alt={data.profile.full_name} />
              ) : null}
              <AvatarFallback className="bg-secondary text-xs">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gradient">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
