"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { bulkCreateLearners, updateLearner, deleteLearner } from "@/app/actions";
import { learnerSchema } from "@/lib/schemas";
import type { LearnerRequest, LearnerResponse, CohortResponse } from "@/lib/types";

type Row = LearnerRequest & { __error?: string };

const REQUIRED = ["fullname", "email", "phone"];

function toLearnerRequest(l: LearnerResponse, cohortId?: number | null): LearnerRequest {
  return {
    fullname: l.fullname,
    email: l.email,
    phone: l.phone,
    gender: l.gender,
    location: l.location,
    region: l.region,
    institution: l.institution,
    graduated: l.graduated,
    cohortId: cohortId == null ? undefined : cohortId,
  };
}

export function LearnersClient({
  tenant, initial, cohorts,
}: { tenant: string; initial: LearnerResponse[]; cohorts: CohortResponse[] }) {
  const [list, setList] = useState(initial);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, start] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detail, setDetail] = useState<LearnerResponse | null>(null);
  const [detailCohortId, setDetailCohortId] = useState<number | "">("");
  const [bulkCohortId, setBulkCohortId] = useState<number | "">("");

  const q = query.toLowerCase();
  const visible = q
    ? list.filter(l =>
        l.fullname.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (cohorts.find(c => c.id === l.cohortId)?.name ?? "").toLowerCase().includes(q),
      )
    : list;

  const allSelected = visible.length > 0 && visible.every(l => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => { const n = new Set(prev); visible.forEach(l => n.delete(l.id)); return n; });
    } else {
      setSelectedIds(prev => new Set([...prev, ...visible.map(l => l.id)]));
    }
  };

  const toggleOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const openDetail = (l: LearnerResponse) => {
    setDetail(l);
    setDetailCohortId(l.cohortId ?? "");
  };

  const saveDetailCohort = () => start(async () => {
    if (!detail) return;
    const cohortId = detailCohortId === "" ? null : detailCohortId;
    const r = await updateLearner(tenant, detail.id, toLearnerRequest(detail, cohortId));
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Learner updated");
    const updated = { ...detail, cohortId: cohortId };
    setList(list.map(l => l.id === detail.id ? updated : l));
    setDetail(updated);
  });

  const removeOne = (id: number) => start(async () => {
    if (!confirm("Delete this learner? This cannot be undone.")) return;
    const r = await deleteLearner(tenant, id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Learner deleted");
    setList(list.filter(l => l.id !== id));
    setDetail(null);
  });

  const bulkAssign = (cohortId: number | null) => start(async () => {
    const targets = list.filter(l => selectedIds.has(l.id));
    const results = await Promise.all(
      targets.map(l => updateLearner(tenant, l.id, toLearnerRequest(l, cohortId)))
    );
    const failed = results.filter(r => !r.ok).length;
    if (failed) toast.error(`${failed} update(s) failed`);
    else toast.success(`Updated ${targets.length} learner(s)`);
    setList(list.map(l => selectedIds.has(l.id) ? { ...l, cohortId } : l));
    setSelectedIds(new Set());
    setBulkCohortId("");
  });

  const onFile = (f: File) => {
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const parsed: Row[] = res.data.map((r) => {
          const row: Row = {
            fullname: r.fullname || r["full name"] || "",
            email: r.email || "",
            phone: r.phone || "",
            gender: r.gender || null,
            location: r.location || null,
            region: r.region || null,
            institution: r.institution || null,
            graduated: r.graduated === "true" || r.graduated === "1",
          };
          for (const k of REQUIRED) if (!(row as any)[k]) row.__error = `Missing ${k}`;
          if (!row.__error) {
            const v = learnerSchema.safeParse(row);
            if (!v.success) row.__error = v.error.issues[0].message;
          }
          return row;
        });
        setRows(parsed);
      },
    });
  };

  const submit = () => start(async () => {
    const valid = rows.filter(r => !r.__error).map(({ __error, ...rest }) => rest);
    if (valid.length === 0) { toast.error("No valid rows to import"); return; }
    const r = await bulkCreateLearners(tenant, valid);
    if (!r.ok) {
      toast.error(r.error);
      if ((r as any).rowErrors) console.warn((r as any).rowErrors);
      return;
    }
    toast.success(`Imported ${r.data.length} learners`);
    setList([...r.data, ...list]);
    setRows([]);
  });

  const errors = rows.filter(r => r.__error).length;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Learners ({list.length})</CardTitle>
              <Input
                className="max-w-xs"
                placeholder="Search learners…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {someSelected && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                <span className="font-medium">{selectedIds.size} selected</span>
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  <select
                    value={bulkCohortId}
                    onChange={e => setBulkCohortId(Number(e.target.value) || "")}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    disabled={pending}
                  >
                    <option value="">Select cohort…</option>
                    {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Button size="sm" disabled={pending || bulkCohortId === ""} onClick={() => bulkAssign(bulkCohortId as number)}>
                    Assign to cohort
                  </Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => bulkAssign(null)}>
                    Remove from cohort
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                </div>
              </div>
            )}
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">No learners yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 w-10">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleAll}
                          aria-label="Select all"
                        />
                      </th>
                      <th className="py-2">Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Cohort</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No matching learners.</td></tr>}
                    {visible.map(l => (
                      <tr key={l.id} className="border-t hover:bg-muted/30">
                        <td className="py-2 pr-3" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(l.id)}
                            onCheckedChange={() => toggleOne(l.id)}
                            aria-label={`Select ${l.fullname}`}
                          />
                        </td>
                        <td className="py-2 cursor-pointer font-medium hover:underline" onClick={() => openDetail(l)}>{l.fullname}</td>
                        <td className="cursor-pointer" onClick={() => openDetail(l)}>{l.email}</td>
                        <td className="cursor-pointer font-mono text-xs" onClick={() => openDetail(l)}>{l.phone}</td>
                        <td className="cursor-pointer" onClick={() => openDetail(l)}>{cohorts.find(c => c.id === l.cohortId)?.name ?? "—"}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" disabled={pending} onClick={() => removeOne(l.id)} className="text-destructive hover:text-destructive">Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bulk import</CardTitle>
            <CardDescription>CSV with columns: fullname, email, phone, gender, location, region, institution, graduated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>CSV file</Label>
              <Input type="file" accept=".csv" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
            </div>
            {rows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm">{rows.length - errors} valid · <span className={errors ? "text-destructive" : ""}>{errors} errors</span></p>
                <div className="max-h-48 overflow-y-auto border rounded-md text-xs">
                  {rows.map((r, i) => (
                    <div key={i} className={`px-2 py-1 border-b ${r.__error ? "bg-destructive/10" : ""}`}>
                      {r.fullname || "(no name)"} {r.__error && <span className="text-destructive">— {r.__error}</span>}
                    </div>
                  ))}
                </div>
                <Button className="w-full" disabled={pending || rows.length === errors} onClick={submit}>
                  {pending ? "Importing…" : `Import ${rows.length - errors} learners`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={detail !== null} onOpenChange={open => !open && setDetail(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{detail?.fullname}</SheetTitle>
            <SheetDescription>{detail?.email}</SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-mono">{detail.phone}</dd>
                <dt className="text-muted-foreground">Gender</dt>
                <dd>{detail.gender ?? "—"}</dd>
                <dt className="text-muted-foreground">Location</dt>
                <dd>{detail.location ?? "—"}</dd>
                <dt className="text-muted-foreground">Region</dt>
                <dd>{detail.region ?? "—"}</dd>
                <dt className="text-muted-foreground">Institution</dt>
                <dd>{detail.institution ?? "—"}</dd>
                <dt className="text-muted-foreground">Graduated</dt>
                <dd>{detail.graduated ? "Yes" : "No"}</dd>
                <dt className="text-muted-foreground">Joined</dt>
                <dd>{new Date(detail.createdAt).toLocaleDateString()}</dd>
              </dl>
              <div className="space-y-2">
                <Label>Cohort</Label>
                <select
                  value={detailCohortId}
                  onChange={e => setDetailCohortId(Number(e.target.value) || "")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={pending}
                >
                  <option value="">No cohort</option>
                  {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <Button className="w-full" disabled={pending} onClick={saveDetailCohort}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
              <Button variant="destructive" className="w-full" disabled={pending} onClick={() => detail && removeOne(detail.id)}>
                Delete learner
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
