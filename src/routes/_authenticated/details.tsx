import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  GitBranch,
  Globe,
  Camera,
  BriefcaseBusiness,
  Play,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { AvatarPicker } from "@/components/AvatarPicker";
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

import { useServerFn } from "@tanstack/react-start";
import { updateProfile } from "@/lib/data.functions";
import { useMe } from "@/hooks/usePortal";

export const Route = createFileRoute(
  "/_authenticated/details",
)({
  head: () => ({
    meta: [
      {
        title:
          "My details — Campus Portal",
      },
      {
        name: "description",
        content:
          "Add your personal and professional details.",
      },
      {
        property:
          "og:title",
        content:
          "My details — Campus Portal",
      },
    ],
  }),

  component:
    DetailsPage,
});

const fields = [
  {
    key: "full_name",
    label: "Full name",
  },
  {
    key: "dob",
    label: "Date of birth",
    type: "date",
  },
  {
    key: "department",
    label: "Department",
  },
  {
    key: "year",
    label: "Year",
  },
  {
    key: "section",
    label: "Section",
  },
  {
    key: "phone",
    label: "Phone",
  },
  {
    key: "email",
    label: "Email",
    type: "email",
  },
  {
    key: "blood_group",
    label: "Blood group",
  },
  {
    key: "guardian_name",
    label: "Guardian name",
  },
  {
    key: "guardian_phone",
    label: "Guardian phone",
  },
] as const;

const professionalFields = [
  {
    key: "instagram_url",
    label: "Instagram",
    placeholder:
      "https://instagram.com/username",
  },
  {
    key: "linkedin_url",
    label: "LinkedIn",
    placeholder:
      "https://linkedin.com/in/username",
  },
  {
    key: "github_url",
    label: "GitHub",
    placeholder:
      "https://github.com/username",
  },
  {
    key: "leetcode_url",
    label: "LeetCode",
    placeholder:
      "https://leetcode.com/username",
  },
  {
    key: "hackerrank_url",
    label: "HackerRank",
    placeholder:
      "https://hackerrank.com/username",
  },
  {
    key: "portfolio_url",
    label: "Portfolio",
    placeholder:
      "https://yourportfolio.com",
  },
  {
    key: "twitter_url",
    label: "X / Twitter",
    placeholder:
      "https://x.com/username",
  },
  {
    key: "youtube_url",
    label: "YouTube",
    placeholder:
      "https://youtube.com/@username",
  },
] as const;

type FormState =
  Record<string, string>;

function DetailsPage() {
  const { data: me } =
    useMe();

  const profile =
    me?.profile;

  const queryClient =
    useQueryClient();

  const [
    form,
    setForm,
  ] =
    useState<FormState>({});

  const updateProfileFn =
    useServerFn(
      updateProfile,
    );

  useEffect(() => {
    if (!profile) {
      return;
    }

    const next: FormState = {
      address:
        profile.address ??
        "",

      photo_url:
        profile.photo_url ??
        "",
    };

    for (const field of fields) {
      next[field.key] =
        (profile[
          field.key
        ] as string | null) ??
        "";
    }

    for (
      const field of professionalFields
    ) {
      next[field.key] =
        (profile[
          field.key
        ] as string | null) ??
        "";
    }

    setForm(next);
  }, [profile]);

  const save =
    useMutation({
      mutationFn:
        async () => {
          if (!profile) {
            throw new Error(
              "Profile not loaded.",
            );
          }

          await updateProfileFn({
            data: {
              full_name:
                form[
                  "full_name"
                ] ||
                profile.full_name,

              dob:
                form["dob"] ||
                null,

              department:
                form[
                  "department"
                ] || null,

              year:
                form["year"] ||
                null,

              section:
                form[
                  "section"
                ] || null,

              phone:
                form["phone"] ||
                null,

              email:
                form["email"] ||
                null,

              blood_group:
                form[
                  "blood_group"
                ] || null,

              guardian_name:
                form[
                  "guardian_name"
                ] || null,

              guardian_phone:
                form[
                  "guardian_phone"
                ] || null,

              photo_url:
                form[
                  "photo_url"
                ] || null,

              address:
                form[
                  "address"
                ] || null,

              instagram_url:
                form[
                  "instagram_url"
                ] || null,

              linkedin_url:
                form[
                  "linkedin_url"
                ] || null,

              github_url:
                form[
                  "github_url"
                ] || null,

              leetcode_url:
                form[
                  "leetcode_url"
                ] || null,

              hackerrank_url:
                form[
                  "hackerrank_url"
                ] || null,

              portfolio_url:
                form[
                  "portfolio_url"
                ] || null,

              twitter_url:
                form[
                  "twitter_url"
                ] || null,

              youtube_url:
                form[
                  "youtube_url"
                ] || null,
            },
          });
        },

      onSuccess:
        () => {
          toast.success(
            "Details saved.",
          );

          queryClient.invalidateQueries(
            {
              queryKey: [
                "me",
              ],
            },
          );

          queryClient.invalidateQueries(
            {
              queryKey: [
                "students",
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

  const initials =
    (
      profile?.full_name ??
      "??"
    )
      .split(" ")
      .map(
        (part) =>
          part[0],
      )
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <AppShell
      title="Personal details"
      subtitle="Keep your personal and professional information up to date."
    >
      <div className="space-y-6">
        {/* PERSONAL */}
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <Card className="panel h-fit border-0">
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <AvatarPicker
                value={
                  form[
                    "photo_url"
                  ] ?? ""
                }
                initials={
                  initials
                }
                onChange={(
                  dataUrl,
                ) =>
                  setForm(
                    (
                      previous,
                    ) => ({
                      ...previous,
                      photo_url:
                        dataUrl,
                    }),
                  )
                }
              />

              <p className="text-sm font-medium">
                {form[
                  "full_name"
                ] ||
                  profile?.full_name}
              </p>

              <p className="text-xs text-muted-foreground">
                Register No.{" "}
                {
                  profile?.register_no
                }
              </p>
            </CardContent>
          </Card>

          <Card className="panel border-0">
            <CardHeader>
              <CardTitle>
                Personal details
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map(
                  (field) => (
                    <div
                      key={
                        field.key
                      }
                      className="space-y-1.5"
                    >
                      <Label
                        htmlFor={
                          field.key
                        }
                      >
                        {
                          field.label
                        }
                      </Label>

                      <Input
                        id={
                          field.key
                        }
                        type={
                          "type" in
                          field
                            ? field.type
                            : "text"
                        }
                        value={
                          form[
                            field.key
                          ] ?? ""
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              previous,
                            ) => ({
                              ...previous,
                              [field.key]:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                      />
                    </div>
                  ),
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">
                  Address
                </Label>

                <Textarea
                  id="address"
                  rows={3}
                  value={
                    form[
                      "address"
                    ] ?? ""
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        address:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PROFESSIONAL */}
        <Card className="panel border-0">
          <CardHeader>
            <CardTitle>
              Professional & Social Profiles
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              Add links to your coding, professional and social profiles.
            </p>
          </CardHeader>

          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2">
              {professionalFields.map(
                (field) => {
                  const Icon =
                    field.key ===
                    "instagram_url"
                      ? Camera
                      : field.key ===
                          "linkedin_url"
                        ? BriefcaseBusiness
                        : field.key ===
                            "github_url"
                          ? GitBranch
                          : field.key ===
                              "youtube_url"
                            ? Play
                            : Globe;

                  return (
                    <div
                      key={
                        field.key
                      }
                      className="space-y-1.5"
                    >
                      <Label
                        htmlFor={
                          field.key
                        }
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="size-4" />
                          {
                            field.label
                          }
                        </span>
                      </Label>

                      <Input
                        id={
                          field.key
                        }
                        type="url"
                        value={
                          form[
                            field.key
                          ] ?? ""
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              previous,
                            ) => ({
                              ...previous,
                              [field.key]:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        placeholder={
                          field.placeholder
                        }
                      />
                    </div>
                  );
                },
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={() =>
              save.mutate()
            }
            disabled={
              save.isPending
            }
          >
            {save.isPending
              ? "Saving…"
              : "Save details"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}