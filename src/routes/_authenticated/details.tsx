import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { AvatarPicker } from "@/components/AvatarPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { updateProfile } from "@/lib/data.functions";
import { useMe } from "@/hooks/usePortal";

export const Route = createFileRoute("/_authenticated/details")({
  head: () => ({
    meta: [
      { title: "My details — Campus Portal" },
      {
        name: "description",
        content: "Add your personal details: contact, department, guardian and photo.",
      },
      { property: "og:title", content: "My details — Campus Portal" },
      { property: "og:description", content: "Keep your personal student record up to date." },
    ],
  }),
  component: DetailsPage,
});

const fields = [
  { key: "full_name", label: "Full name" },
  { key: "dob", label: "Date of birth", type: "date" },
  { key: "department", label: "Department" },
  { key: "year", label: "Year" },
  { key: "section", label: "Section" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email", type: "email" },
  { key: "blood_group", label: "Blood group" },
  { key: "guardian_name", label: "Guardian name" },
  { key: "guardian_phone", label: "Guardian phone" },
] as const;

type FormState = Record<string, string>;

function DetailsPage() {
  const { data: me } = useMe();
  const profile = me?.profile;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>({});
  const updateProfileFn = useServerFn(updateProfile);

  useEffect(() => {
    if (!profile) return;
    const next: FormState = {
      address: profile.address ?? "",
      photo_url: profile.photo_url ?? "",
    };
    for (const f of fields) next[f.key] = (profile[f.key] as string | null) ?? "";
    setForm(next);
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: form["full_name"] || profile!.full_name,
        dob: form["dob"] || null,
        department: form["department"] || null,
        year: form["year"] || null,
        section: form["section"] || null,
        phone: form["phone"] || null,
        email: form["email"] || null,
        blood_group: form["blood_group"] || null,
        guardian_name: form["guardian_name"] || null,
        guardian_phone: form["guardian_phone"] || null,
        photo_url: form["photo_url"] || null,
        address: form["address"] || null,
      };
      await updateProfileFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Details saved.");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const initials = (profile?.full_name ?? "??")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppShell title="Personal details" subtitle="These details appear on your dashboard.">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="panel border-0 h-fit">
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <AvatarPicker
              value={form["photo_url"] ?? ""}
              initials={initials}
              onChange={(dataUrl) => setForm((p) => ({ ...p, photo_url: dataUrl }))}
            />
            <p className="text-sm font-medium">{form["full_name"] || profile?.full_name}</p>
            <p className="text-xs text-muted-foreground">Register No. {profile?.register_no}</p>
          </CardContent>
        </Card>

        <Card className="panel border-0">
          <CardHeader>
            <CardTitle>Edit details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    type={"type" in f ? f.type : "text"}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                rows={3}
                value={form["address"] ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              />
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save details"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
