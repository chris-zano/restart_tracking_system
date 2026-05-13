"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { createCohort, updateCohort, deleteCohort } from "@/app/actions";
import type { CohortResponse, TrackResponse } from "@/lib/types";
import Link from "next/link";

export function CohortsClient({
  tenant, initial, tracks,
}: { tenant: string; initial: CohortResponse[]; tracks: TrackResponse[] }) {
  const [list, setList]               = useState(initial);
  const [query, setQuery]             = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detail, setDetail]           = useState<CohortResponse | null>(null);
  const [pending, start]              = useTransition();

  // ── Create form ──
  const [newName, setNewName]         = useState("");
  const [newTrackId, setNewTrackId]   = useState<number | "">(tracks[0]?.id ?? "");

  // ── Sheet edit form ──
  const [editName, setEditName]       = useState("");
  const [editDesc, setEditDesc]       = useState("");
  const [editTrackId, setEditTrackId] = useState<number | "">("");

  const trackById = (id: number | null | undefined) =>
    tracks.find(t => t.id === id) ?? null;

  const copyPortalLink = (cohortId: number) => {
    const url = `${window.location.origin}/${tenant}/portal/${cohortId}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Portal link copied"));
  };

  const q = query.toLowerCase();
  const visible = q
    ? list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (trackById(c.trackId)?.name ?? "").toLowerCase().includes(q),
      )
    : list;

  const openDetail = (c: CohortResponse) => {
    setDetail(c);
    setEditName(c.name);
    setEditDesc(c.description ?? "");
    setEditTrackId(c.trackId ?? "");
  };

  // ── Selection ──
  const allSelected = visible.length > 0 && visible.every(c => selectedIds.has(c.id));
  const toggleAll   = () => {
    if (allSelected) {
      setSelectedIds(prev => { const n = new Set(prev); visible.forEach(c => n.delete(c.id)); return n; });
    } else {
      setSelectedIds(prev => new Set([...prev, ...visible.map(c => c.id)]));
    }
  };
  const toggleOne   = (id: number) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // ── Mutations ──
  const submit = () => start(async () => {
    const r = await createCohort(tenant, { name: newName, trackId: newTrackId || undefined });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`Cohort "${r.data.name}" created`);
    setList(prev => [r.data, ...prev]);
    setNewName("");
  });

  const saveDetail = () => start(async () => {
    if (!detail) return;
    const r = await updateCohort(tenant, detail.id, {
      name: editName,
      description: editDesc,
      trackId: editTrackId || undefined,
    });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Cohort updated");
    setList(prev => prev.map(c => c.id === detail.id ? r.data : c));
    setDetail(r.data);
  });

  const removeOne = (id: number) => start(async () => {
    if (!confirm("Delete this cohort?")) return;
    const r = await deleteCohort(tenant, id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Cohort deleted");
    setList(prev => prev.filter(c => c.id !== id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    if (detail?.id === id) setDetail(null);
  });

  const bulkAssignTrack = (trackId: number | null) => start(async () => {
    const ids = [...selectedIds];
    const results = await Promise.all(ids.map(id => {
      const c = list.find(x => x.id === id)!;
      return updateCohort(tenant, id, {
        name: c.name,
        description: c.description ?? "",
        trackId: trackId ?? undefined,
      });
    }));
    const failed = results.filter(r => !r.ok).length;
    if (failed) toast.error(`${failed} update(s) failed`);
    else toast.success(`Track updated for ${ids.length} cohort(s)`);
    setList(prev => prev.map(c => {
      if (!selectedIds.has(c.id)) return c;
      const r = results[ids.indexOf(c.id)];
      return r.ok ? r.data : c;
    }));
    setSelectedIds(new Set());
  });

  const bulkDelete = () => start(async () => {
    if (!confirm(`Delete ${selectedIds.size} cohort(s)?`)) return;
    const ids = [...selectedIds];
    const results = await Promise.all(ids.map(id => deleteCohort(tenant, id)));
    const failed = results.filter(r => !r.ok).length;
    if (failed) toast.error(`${failed} delete(s) failed`);
    else toast.success(`${ids.length} cohort(s) deleted`);
    const deleted = new Set(ids.filter((_, i) => results[i].ok));
    setList(prev => prev.filter(c => !deleted.has(c.id)));
    setSelectedIds(new Set());
    if (detail && deleted.has(detail.id)) setDetail(null);
  });

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* ── Table ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Your cohorts</CardTitle>
              <Input
                className="max-w-xs"
                placeholder="Search cohorts…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  value=""
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "__remove__") bulkAssignTrack(null);
                    else if (val) bulkAssignTrack(Number(val));
                  }}
                >
                  <option value="" disabled>Assign track…</option>
                  <option value="__remove__">— Remove track —</option>
                  {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <Button variant="destructive" size="sm" disabled={pending} onClick={bulkDelete}>
                  Delete selected
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cohorts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 w-8">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                      </th>
                      <th className="py-2">Name</th>
                      <th>Track</th>
                      <th className="hidden sm:table-cell">Description</th>
                      <th className="w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No matching cohorts.</td></tr>}
                    {visible.map(c => {
                      const track = trackById(c.trackId);
                      return (
                        <tr key={c.id} className="border-t">
                          <td className="py-2 pr-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(c.id)}
                              onChange={() => toggleOne(c.id)}
                              onClick={e => e.stopPropagation()}
                            />
                          </td>
                          <td className="py-2 font-medium">
                            <button className="hover:underline text-left" onClick={() => openDetail(c)}>
                              {c.name}
                            </button>
                          </td>
                          <td>
                            {track
                              ? <Badge variant="secondary" className="text-xs font-normal">{track.name}</Badge>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="hidden sm:table-cell text-muted-foreground max-w-xs truncate">
                            {c.description || "—"}
                          </td>
                          <td className="text-right space-x-1">
                            <Link
                              href={`/${tenant}/instructor/cohorts/${c.id}`}
                              className="text-xs text-muted-foreground hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              View
                            </Link>
                            <Button
                              variant="ghost" size="sm"
                              onClick={e => { e.stopPropagation(); copyPortalLink(c.id); }}
                            >
                              Copy link
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              disabled={pending}
                              onClick={e => { e.stopPropagation(); removeOne(c.id); }}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Create form — compact, matches learners Bulk import card ── */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>New cohort</CardTitle>
            <CardDescription>e.g. Christian_Jan26_Uni_Foundation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Cohort name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Track</Label>
              <select
                value={newTrackId}
                onChange={e => setNewTrackId(Number(e.target.value) || "")}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No track</option>
                {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <Button className="w-full" disabled={pending || !newName} onClick={submit}>
              {pending ? "Creating…" : "Create"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Edit Sheet ── */}
      <Sheet open={!!detail} onOpenChange={open => { if (!open) setDetail(null); }}>
        <SheetContent className="overflow-y-auto">
          {detail && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle>{detail.name}</SheetTitle>
              </SheetHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-1.5">
                  <Label>Track</Label>
                  <select
                    value={editTrackId}
                    onChange={e => setEditTrackId(Number(e.target.value) || "")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No track</option>
                    {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" disabled={pending || !editName} onClick={saveDetail}>
                  {pending ? "Saving…" : "Save changes"}
                </Button>
                <Button variant="destructive" disabled={pending} onClick={() => removeOne(detail.id)}>
                  Delete
                </Button>
              </div>

              <div className="border-t pt-4 space-y-2">
                <Link
                  href={`/${tenant}/instructor/cohorts/${detail.id}`}
                  className="text-sm text-primary hover:underline block"
                >
                  View learners & sessions →
                </Link>
                <button
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                  onClick={() => copyPortalLink(detail.id)}
                >
                  Copy public portal link
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
