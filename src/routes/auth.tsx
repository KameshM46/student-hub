import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loginAccount, registerAccount } from "@/lib/portal.functions";
import type { PortalRole } from "@/lib/portal";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Campus Portal" },
      {
        name: "description",
        content:
          "Students sign in with their exam register number and date of birth. Staff sign in with a staff number and access code.",
      },
      { property: "og:title", content: "Sign in — Campus Portal" },
      {
        property: "og:description",
        content: "Register number and date of birth sign-in for students and staff.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [role, setRole] = useState<PortalRole>("student");
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [identifier, setIdentifier] = useState("");
  const [dob, setDob] = useState("");
  const [fullName, setFullName] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const register = useServerFn(registerAccount);
  const login = useServerFn(loginAccount);

  async function signIn() {
    const result = await login({ data: { role, identifier, dob } });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!identifier || !dob) {
      toast.error("Fill in every field.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn();
      } else {
        const result = await register({
          data: { role, identifier, dob, fullName, adminCode },
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Account created. Signing you in…");
        await signIn();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-semibold">
          <GraduationCap className="size-6 text-primary" />
          Campus Portal
        </Link>

        <div className="panel p-6">
          <Tabs value={role} onValueChange={(v) => setRole(v as PortalRole)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
            <TabsContent value="student" className="mt-4 text-sm text-muted-foreground">
              Sign in with your exam register number and date of birth.
            </TabsContent>
            <TabsContent value="admin" className="mt-4 text-sm text-muted-foreground">
              Sign in with your staff number and date of birth. Registering as an admin needs the
              access code.
            </TabsContent>
          </Tabs>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {mode === "register" ? (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aarthi Ramesh"
                  required
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="identifier">
                {role === "admin" ? "Staff number" : "Exam register number"}
              </Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={role === "admin" ? "STAFF1024" : "9152210045"}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />
            </div>

            {mode === "register" && role === "admin" ? (
              <div className="space-y-1.5">
                <Label htmlFor="code">Admin access code</Label>
                <Input
                  id="code"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Provided by the institution"
                  required
                />
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "register" : "signin")}
            className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {mode === "signin"
              ? "First time here? Create an account"
              : "Already registered? Sign in"}
          </button>
        </div>

        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Your date of birth is your password — keep it private.
        </p>
      </div>
    </div>
  );
}
