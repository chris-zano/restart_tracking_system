"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createTrack, updateTrack, deleteTrack } from "@/app/actions";
import { cn } from "@/lib/utils";
import type { TrackResponse } from "@/lib/types";
import { ArrowLeft, Check, Pencil, Trash2, Plus } from "lucide-react";

// ─── Domain / cert / profile data ─────────────────────────────────────────

type Domain = "Foundations" | "Associate" | "Professional";
type Profile = "University" | "External" | "Internal";

const DOMAIN_META: { value: Domain; label: string; description: string; color: string }[] = [
  { value: "Foundations", label: "Foundations", description: "Entry-level cloud fluency", color: "bg-sky-50 border-sky-300 text-sky-800 data-[active=true]:bg-sky-100 data-[active=true]:border-sky-500 data-[active=true]:ring-2 data-[active=true]:ring-sky-400" },
  { value: "Associate",   label: "Associate",   description: "Intermediate role-based skills", color: "bg-violet-50 border-violet-300 text-violet-800 data-[active=true]:bg-violet-100 data-[active=true]:border-violet-500 data-[active=true]:ring-2 data-[active=true]:ring-violet-400" },
  { value: "Professional", label: "Professional", description: "Advanced architecture expertise", color: "bg-amber-50 border-amber-300 text-amber-800 data-[active=true]:bg-amber-100 data-[active=true]:border-amber-500 data-[active=true]:ring-2 data-[active=true]:ring-amber-400" },
];

const CERTS: Record<Domain, { code: string; label: string }[]> = {
  Foundations:  [{ code: "CCP", label: "Cloud Practitioner" }],
  Associate:    [
    { code: "SAA", label: "Solutions Architect" },
    { code: "DVA", label: "Developer" },
    { code: "SOA", label: "SysOps Administrator" },
    { code: "MLA", label: "Machine Learning" },
    { code: "DEA", label: "Data Engineer" },
  ],
  Professional: [
    { code: "SAP", label: "Solutions Architect Pro" },
    { code: "DOP", label: "DevOps Engineer Pro" },
  ],
};

const PROFILE_META: { value: Profile; label: string; description: string }[] = [
  { value: "University", label: "University", description: "Academic partnership cohort" },
  { value: "External",   label: "External",   description: "External participant cohort" },
  { value: "Internal",   label: "Internal",   description: "Internal staff cohort" },
];

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR, THIS_YEAR + 1, THIS_YEAR + 2];

// ─── Builder state ─────────────────────────────────────────────────────────

type BuilderState = {
  domain:  Domain | null;
  cert:    string | null;
  profile: Profile | null;
  month:   string | null;
  year:    number | null;
};

const EMPTY_BUILDER: BuilderState = { domain: null, cert: null, profile: null, month: null, year: null };

function buildName({ domain, cert, profile, month, year }: BuilderState): string {
  if (!month || !profile || !domain || !cert || !year) return "";
  return `${month}_${profile}_${domain}_${cert}_${year}`;
}

function parseNameToBuilder(name: string): BuilderState {
  const parts = name.split("_");
  if (parts.length < 5) return EMPTY_BUILDER;
  const [month, profile, domain, cert, year] = parts;
  return {
    month:   MONTHS.includes(month) ? month : null,
    profile: ["University", "External", "Internal"].includes(profile) ? profile as Profile : null,
    domain:  ["Foundations", "Associate", "Professional"].includes(domain) ? domain as Domain : null,
    cert:    cert ?? null,
    year:    year ? parseInt(year, 10) : null,
  };
}

// ─── Track list ────────────────────────────────────────────────────────────

export function TracksClient({ initial }: { initial: TrackResponse[] }) {
  const [tracks, setTracks] = useState(initial);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editTarget, setEditTarget] = useState<TrackResponse | null>(null);

  const handleSaved = (track: TrackResponse) => {
    setTracks(prev => {
      const idx = prev.findIndex(t => t.id === track.id);
      return idx >= 0 ? prev.map(t => t.id === track.id ? track : t) : [...prev, track];
    });
    setMode("list");
    setEditTarget(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this track? This cannot be undone.")) return;
    const r = await deleteTrack(id);
    if (!r.ok) { toast.error(r.error); return; }
    setTracks(prev => prev.filter(t => t.id !== id));
    toast.success("Track deleted");
  };

  const openEdit = (track: TrackResponse) => {
    setEditTarget(track);
    setMode("edit");
  };

  if (mode === "create") {
    return (
      <TrackBuilder
        onSaved={handleSaved}
        onCancel={() => setMode("list")}
      />
    );
  }

  if (mode === "edit" && editTarget) {
    return (
      <TrackBuilder
        existing={editTarget}
        onSaved={handleSaved}
        onCancel={() => { setMode("list"); setEditTarget(null); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setMode("create")}>
          <Plus className="h-4 w-4 mr-1" /> New track
        </Button>
      </div>

      {tracks.length === 0 && (
        <p className="text-sm text-muted-foreground">No tracks yet. Create one to get started.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {tracks.map(t => {
          const b = parseNameToBuilder(t.name);
          return (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm leading-snug font-mono">{t.name}</CardTitle>
                  <Badge variant="outline" className="shrink-0 text-xs">#{t.id}</Badge>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {b.domain  && <Badge variant="secondary" className="text-xs">{b.domain}</Badge>}
                  {b.cert    && <Badge variant="secondary" className="text-xs">{b.cert}</Badge>}
                  {b.profile && <Badge variant="secondary" className="text-xs">{b.profile}</Badge>}
                </div>
                {t.description && <CardDescription className="text-xs">{t.description}</CardDescription>}
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Builder ───────────────────────────────────────────────────────────────

function TrackBuilder({
  existing,
  onSaved,
  onCancel,
}: {
  existing?: TrackResponse;
  onSaved: (t: TrackResponse) => void;
  onCancel: () => void;
}) {
  const [phase, setPhase] = useState<"build" | "review">("build");
  const [builder, setBuilder] = useState<BuilderState>(
    existing ? parseNameToBuilder(existing.name) : EMPTY_BUILDER,
  );
  const [description, setDescription] = useState(existing?.description ?? "");
  const [pending, start] = useTransition();

  const set = <K extends keyof BuilderState>(key: K, val: BuilderState[K]) =>
    setBuilder(prev => ({ ...prev, [key]: val }));

  const setDomain = (d: Domain) =>
    setBuilder(prev => ({
      ...prev,
      domain: d,
      cert: CERTS[d].length === 1 ? CERTS[d][0].code : null,
    }));

  const previewName = buildName(builder);
  const isComplete = Boolean(builder.domain && builder.cert && builder.profile && builder.month && builder.year);

  const submit = () => start(async () => {
    const body = { name: previewName, description: description || null };
    const r = existing
      ? await updateTrack(existing.id, body)
      : await createTrack(body);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(existing ? "Track updated" : "Track created");
    onSaved(r.data);
  });

  // ── Review phase ──────────────────────────────────────────────────────────
  if (phase === "review") {
    return (
      <div className="space-y-6 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => setPhase("build")} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to builder
        </Button>

        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">{existing ? "Review changes" : "Review & create"}</CardTitle>
            <CardDescription>Confirm the details before saving.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Row label="Domain"  value={builder.domain ?? ""} />
              <Row label="Certification" value={builder.cert ?? ""} />
              <Row label="Profile" value={builder.profile ?? ""} />
              <Row label="Month"   value={builder.month ?? ""} />
              <Row label="Year"    value={String(builder.year ?? "")} />
            </div>

            <Separator />

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Generated name</p>
              <p className="font-mono text-sm font-semibold break-all">{previewName}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                id="desc"
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Short description of this cohort track"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={submit} disabled={pending}>
                {pending ? "Saving…" : existing ? "Save changes" : "Create track"}
              </Button>
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Build phase ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h2 className="text-lg font-semibold">{existing ? "Edit track" : "Build a new track"}</h2>
      </div>

      {/* Domain */}
      <Section step={1} label="Domain" done={!!builder.domain}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DOMAIN_META.map(d => (
            <button
              key={d.value}
              type="button"
              data-active={builder.domain === d.value}
              onClick={() => setDomain(d.value)}
              className={cn(
                "relative rounded-lg border-2 p-4 text-left transition-all hover:shadow-sm cursor-pointer",
                d.color,
              )}
            >
              {builder.domain === d.value && (
                <Check className="absolute top-3 right-3 h-4 w-4" />
              )}
              <p className="font-semibold text-sm">{d.label}</p>
              <p className="text-xs mt-0.5 opacity-70">{d.description}</p>
            </button>
          ))}
        </div>
      </Section>

      {/* Certification */}
      {builder.domain && CERTS[builder.domain].length > 1 && (
        <Section step={2} label="Certification" done={!!builder.cert}>
          <div className="flex flex-wrap gap-2">
            {CERTS[builder.domain].map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => set("cert", c.code)}
                className={cn(
                  "rounded-md border-2 px-4 py-2 text-sm font-medium transition-all cursor-pointer",
                  builder.cert === c.code
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/50 hover:bg-accent",
                )}
              >
                <span className="font-mono font-bold">{c.code}</span>
                <span className="ml-2 text-xs opacity-80">{c.label}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Profile */}
      <Section step={builder.domain && CERTS[builder.domain].length > 1 ? 3 : 2} label="Participant profile" done={!!builder.profile}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PROFILE_META.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => set("profile", p.value)}
              className={cn(
                "relative rounded-lg border-2 p-4 text-left transition-all hover:shadow-sm cursor-pointer",
                builder.profile === p.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "border-border bg-background hover:border-primary/50",
              )}
            >
              {builder.profile === p.value && (
                <Check className="absolute top-3 right-3 h-4 w-4 text-primary" />
              )}
              <p className="font-semibold text-sm">{p.label}</p>
              <p className="text-xs mt-0.5 text-muted-foreground">{p.description}</p>
            </button>
          ))}
        </div>
      </Section>

      {/* Month */}
      <Section step={builder.domain && CERTS[builder.domain].length > 1 ? 4 : 3} label="Month" done={!!builder.month}>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {MONTHS.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => set("month", m)}
              className={cn(
                "rounded-md border-2 py-2 text-xs font-medium transition-all cursor-pointer",
                builder.month === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/50 hover:bg-accent",
              )}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      </Section>

      {/* Year */}
      <Section step={builder.domain && CERTS[builder.domain].length > 1 ? 5 : 4} label="Year" done={!!builder.year}>
        <div className="flex gap-2">
          {YEARS.map(y => (
            <button
              key={y}
              type="button"
              onClick={() => set("year", y)}
              className={cn(
                "rounded-md border-2 px-6 py-2 text-sm font-semibold transition-all cursor-pointer",
                builder.year === y
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/50 hover:bg-accent",
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </Section>

      {/* Preview bar */}
      <div className={cn(
        "rounded-lg border-2 p-4 transition-all",
        isComplete ? "border-primary bg-primary/5" : "border-border bg-muted/30",
      )}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Preview</p>
        {previewName
          ? <p className="font-mono text-sm font-semibold">{previewName}</p>
          : <p className="text-sm text-muted-foreground italic">Complete all steps above to see the track name</p>
        }
        <div className="mt-3 flex gap-2">
          <Button onClick={() => setPhase("review")} disabled={!isComplete}>
            Review &amp; {existing ? "update" : "create"}
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function Section({
  step, label, done, children,
}: {
  step: number;
  label: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}>
          {done ? <Check className="h-3 w-3" /> : step}
        </span>
        <h3 className="text-sm font-semibold">{label}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
