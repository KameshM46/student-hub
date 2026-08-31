import {
  createFileRoute,
  useNavigate,
  Link,
} from "@tanstack/react-router";

import { useQueryClient } from "@tanstack/react-query";

import { useServerFn } from "@tanstack/react-start";

import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import { useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  loginAccount,
  registerAccount,
} from "@/lib/portal.functions";

import type { PortalRole } from "@/lib/portal";

export const Route =
  createFileRoute(
    "/auth",
  )({
    head: () => ({
      meta: [
        {
          title:
            "Sign in — Campus Portal",
        },
        {
          name: "description",
          content:
            "Students and staff sign in to Campus Portal.",
        },
      ],
    }),

    component:
      AuthPage,
  });

function AuthPage() {
  const [
    role,
    setRole,
  ] =
    useState<PortalRole>(
      "student",
    );

  const [
    mode,
    setMode,
  ] =
    useState<
      "signin" | "register"
    >("signin");

  const [
    identifier,
    setIdentifier,
  ] =
    useState("");

  const [
    dob,
    setDob,
  ] =
    useState("");

  const [
    fullName,
    setFullName,
  ] =
    useState("");

  const [
    adminCode,
    setAdminCode,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    showWelcome,
    setShowWelcome,
  ] =
    useState(false);

  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const register =
    useServerFn(
      registerAccount,
    );

  const login =
    useServerFn(
      loginAccount,
    );

  async function signIn() {
    const result =
      await login({
        data: {
          role,
          identifier,
          dob,
        },
      });

    if (!result.ok) {
      toast.error(
        result.error,
      );

      return;
    }

    await queryClient.invalidateQueries();

    setShowWelcome(true);

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          1800,
        ),
    );

    navigate({
      to:
        role === "admin"
          ? "/admin"
          : "/dashboard",
    });
  }

  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (
      !identifier ||
      !dob
    ) {
      toast.error(
        "Fill in every field.",
      );

      return;
    }

    if (
      mode ===
        "register" &&
      !fullName
    ) {
      toast.error(
        "Enter your full name.",
      );

      return;
    }

    if (
      mode ===
        "register" &&
      role === "admin" &&
      !adminCode
    ) {
      toast.error(
        "Enter the admin access code.",
      );

      return;
    }

    setBusy(true);

    try {
      if (
        mode ===
        "signin"
      ) {
        await signIn();
        return;
      }

      const result =
        await register({
          data: {
            role,
            identifier,
            dob,
            fullName,
            adminCode,
          },
        });

      if (!result.ok) {
        toast.error(
          result.error,
        );

        return;
      }

      toast.success(
        "Account created successfully.",
      );

      await signIn();
    } catch (error) {
      console.error(
        "Registration/Login failed:",
        error,
      );

      const message =
        error instanceof
        Error
          ? error.message
          : "Unknown server error";

      toast.error(
        message,
      );
    } finally {
      setBusy(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* WELCOME ANIMATION                                                      */
  /* ---------------------------------------------------------------------- */

  if (showWelcome) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="animate-[welcomeIcon_0.7s_ease-out_forwards] opacity-0">
            <div className="flex size-24 items-center justify-center rounded-3xl bg-primary/10 shadow-xl ring-1 ring-primary/20">
              <GraduationCap className="size-12 text-primary" />
            </div>
          </div>

          <div className="mt-6 animate-[welcomeCheck_0.7s_0.25s_ease-out_forwards] opacity-0">
            <CheckCircle2 className="size-8 text-green-500" />
          </div>

          <h1 className="mt-5 font-display text-3xl font-bold tracking-tight animate-[welcomeText_0.7s_0.35s_ease-out_forwards] opacity-0 sm:text-4xl">
            Welcome back
          </h1>

          <p className="mt-2 max-w-md text-muted-foreground animate-[welcomeText_0.7s_0.5s_ease-out_forwards] opacity-0">
            {role === "admin"
              ? "Welcome back, Admin."
              : "Your Campus Portal is ready."}
          </p>

          <div className="mt-8 w-48 overflow-hidden rounded-full bg-muted animate-[welcomeText_0.7s_0.65s_ease-out_forwards] opacity-0">
            <div className="h-1 w-full rounded-full bg-primary animate-[loadingLine_1.2s_ease-in-out_infinite]" />
          </div>

          <p className="mt-3 text-xs text-muted-foreground animate-[welcomeText_0.7s_0.7s_ease-out_forwards] opacity-0">
            Loading your portal...
          </p>
        </div>

        <style>{`
          @keyframes welcomeIcon {
            0% {
              opacity: 0;
              transform: scale(0.55) rotate(-8deg);
            }

            60% {
              opacity: 1;
              transform: scale(1.08) rotate(2deg);
            }

            100% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
            }
          }

          @keyframes welcomeCheck {
            0% {
              opacity: 0;
              transform: scale(0.4);
            }

            70% {
              opacity: 1;
              transform: scale(1.15);
            }

            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes welcomeText {
            0% {
              opacity: 0;
              transform: translateY(14px);
            }

            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes loadingLine {
            0% {
              transform: translateX(-100%);
            }

            100% {
              transform: translateX(100%);
            }
          }
        `}</style>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* LOGIN PAGE                                                              */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-semibold"
        >
          <GraduationCap className="size-6 text-primary" />

          Campus Portal
        </Link>

        <div className="panel p-6">
          <Tabs
            value={role}
            onValueChange={(value) =>
              setRole(
                value as PortalRole,
              )
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">
                Student
              </TabsTrigger>

              <TabsTrigger value="admin">
                Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="student"
              className="mt-4 text-sm text-muted-foreground"
            >
              Sign in with your exam register number and date of birth.
            </TabsContent>

            <TabsContent
              value="admin"
              className="mt-4 text-sm text-muted-foreground"
            >
              Sign in with your staff number and date of birth.
            </TabsContent>
          </Tabs>

          <form
            onSubmit={submit}
            className="mt-5 space-y-4"
          >
            {mode ===
            "register" ? (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">
                  Full name
                </Label>

                <Input
                  id="fullName"
                  value={
                    fullName
                  }
                  onChange={(
                    event,
                  ) =>
                    setFullName(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Aarthi Ramesh"
                  required
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="identifier">
                {role ===
                "admin"
                  ? "Staff number"
                  : "Exam register number"}
              </Label>

              <Input
                id="identifier"
                value={
                  identifier
                }
                onChange={(
                  event,
                ) =>
                  setIdentifier(
                    event
                      .target
                      .value,
                  )
                }
                placeholder={
                  role ===
                  "admin"
                    ? "STAFF1024"
                    : "9152210045"
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dob">
                Date of birth
              </Label>

              <Input
                id="dob"
                type="date"
                value={dob}
                onChange={(
                  event,
                ) =>
                  setDob(
                    event
                      .target
                      .value,
                  )
                }
                required
              />
            </div>

            {mode ===
              "register" &&
            role ===
              "admin" ? (
              <div className="space-y-1.5">
                <Label htmlFor="code">
                  Admin access code
                </Label>

                <Input
                  id="code"
                  value={
                    adminCode
                  }
                  onChange={(
                    event,
                  ) =>
                    setAdminCode(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Provided by the institution"
                  required
                />
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={
                busy ||
                showWelcome
              }
            >
              {busy
                ? "Please wait…"
                : mode ===
                    "signin"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() =>
              setMode(
                mode ===
                  "signin"
                  ? "register"
                  : "signin",
              )
            }
            className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            disabled={busy}
          >
            {mode ===
            "signin"
              ? "First time here? Create an account"
              : "Already registered? Sign in"}
          </button>
        </div>

        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />

          Your date of birth is your password —
          keep it private.
        </p>
      </div>
    </div>
  );
}