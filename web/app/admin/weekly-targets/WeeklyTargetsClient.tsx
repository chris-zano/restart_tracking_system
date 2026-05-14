"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { upsertWeeklyTarget } from "@/app/actions";
import { WEEK_NUMBERS, type WeeklyTargetResponse, type WeekNumber, type TrackResponse } from "@/lib/types";

export function WeeklyTargetsClient({
  tracks,
  initial,
}: {
  tracks: TrackResponse[];
  initial: Record<number, WeeklyTargetResponse[]>;
}) {
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? 0);
  const [targetsMap, setTargetsMap] = useState(initial);
  const targets = targetsMap[trackId] ?? [];
  const byWeek = Object.fromEntries(targets.map(t => [t.weekNumber, t]));
  const [editing, setEditing] = useState<WeekNumber | null>(null);

  const handleSaved = (saved: WeeklyTargetResponse) => {
    setTargetsMap(prev => {
      const list = prev[saved.trackId] ?? [];
      const exists = list.some(t => t.weekNumber === saved.weekNumber);
      return {
        ...prev,
        [saved.trackId]: exists
          ? list.map(t => t.weekNumber === saved.weekNumber ? saved : t)
          : [...list, saved],
      };
    });
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="mr-2">Track</Label>
        {tracks.map(t => (
          <Button key={t.id} variant={trackId === t.id ? "default" : "outline"} size="sm" onClick={() => { setTrackId(t.id); setEditing(null); }}>
            {t.name}
          </Button>
        ))}
      </div>
      <Accordion type="single" collapsible className="rounded-md border divide-y divide-border">
        {WEEK_NUMBERS.map(w => {
          const t = byWeek[w];
          const kcCount = t?.knowledgeChecks.length ?? 0;
          const labCount = t?.labs.length ?? 0;
          return (
            <AccordionItem key={w} value={w} className="border-0">
              <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/50 rounded-none">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{w.replace("_", " ")}</span>
                  <Badge variant={t ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                    {t ? `${kcCount} KC · ${labCount} Lab` : "Not set"}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                {t ? (
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium mb-1 text-xs uppercase tracking-wide text-muted-foreground">Knowledge checks ({kcCount})</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                        {t.knowledgeChecks.map(k => <li key={k}>{k}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium mb-1 text-xs uppercase tracking-wide text-muted-foreground">Labs ({labCount})</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                        {t.labs.map(l => <li key={l}>{l}</li>)}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No targets set for this week yet.</p>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditing(w)}>
                  {t ? "Edit" : "Set targets"}
                </Button>
                {editing === w && (
                  <WeekEditor key={`${trackId}-${w}`} trackId={trackId} weekNumber={w} existing={t} onSaved={handleSaved} onClose={() => setEditing(null)} />
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function WeekEditor({
  trackId, weekNumber, existing, onSaved, onClose,
}: { trackId: number; weekNumber: WeekNumber; existing?: WeeklyTargetResponse; onSaved: (saved: WeeklyTargetResponse) => void; onClose: () => void }) {
  const [labs, setLabs] = useState((existing?.labs ?? []).join("\n"));
  const [kcs, setKcs] = useState((existing?.knowledgeChecks ?? []).join("\n"));
  const [pending, start] = useTransition();

  const save = () => start(async () => {
    const body = {
      trackId,
      weekNumber,
      labs: labs.split("\n").map(s => s.trim()).filter(Boolean),
      knowledgeChecks: kcs.split("\n").map(s => s.trim()).filter(Boolean),
    };
    const r = await upsertWeeklyTarget(body, existing?.id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`${weekNumber.replace("_", " ")} saved`);
    onSaved(r.data);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{weekNumber.replace("_", " ")}</CardTitle>
        <CardDescription>One target per line. These names must match the Canvas gradebook column headers.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Knowledge checks</Label>
          <Textarea rows={8} value={kcs} onChange={e => setKcs(e.target.value)} placeholder="KC: Cloud Concepts" />
        </div>
        <div className="space-y-2">
          <Label>Labs</Label>
          <Textarea rows={8} value={labs} onChange={e => setLabs(e.target.value)} placeholder="Lab 1.2 — IAM Roles" />
        </div>
      </CardContent>
      <CardContent className="flex gap-2">
        <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </CardContent>
    </Card>
  );
}
