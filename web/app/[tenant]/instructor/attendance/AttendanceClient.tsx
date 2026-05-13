"use client";

import { useMemo, useState, useTransition, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  recordAttendance, getAttendanceByCohort,
  updateAttendanceSession, deleteAttendanceSession,
} from "@/app/actions";
import type { AttendanceRequest, AttendanceResponse, CohortResponse, LearnerResponse, ZoomCsvRow, ZoomMatchedRow } from "@/lib/types";

// ─── Fuzzy matching ───────────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function tokenise(raw: string): Set<string> {
  const tokens = raw
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .replace(/\d+/g, " ")
    .replace(/[^a-zA-Z\s]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 0);
  return new Set(tokens);
}

function tokenScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 1) return b.startsWith(a) ? 0.7 : 0;
  if (b.length === 1) return a.startsWith(b) ? 0.7 : 0;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const dist = levenshtein(a, b);
  const ratio = dist / Math.max(a.length, b.length);
  return ratio <= 0.3 ? 1 - ratio : 0;
}

function fuzzyScore(csvName: string, dbName: string): number {
  const at = tokenise(csvName);
  const bt = [...tokenise(dbName)];
  if (!at.size || !bt.length) return 0;
  let matched = 0;
  for (const a of at) matched += Math.max(0, ...bt.map(b => tokenScore(a, b)));
  const union = at.size + bt.length - matched;
  return union <= 0 ? 1 : matched / union;
}

function autoMatch(csvName: string, cohortLearners: LearnerResponse[]): Pick<ZoomMatchedRow, "learnerId" | "kind"> {
  if (!cohortLearners.length) return { learnerId: null, kind: "unmatched" };
  let bestId: number | null = null, bestScore = 0;
  for (const l of cohortLearners) {
    const s = fuzzyScore(csvName, l.fullname);
    if (s > bestScore) { bestScore = s; bestId = l.id; }
  }
  if (bestScore >= 0.7) return { learnerId: bestId, kind: "exact" };
  if (bestScore >= 0.4) return { learnerId: bestId, kind: "fuzzy" };
  return { learnerId: null, kind: "unmatched" };
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return new Date(`${y}-${m}-${d}T00:00:00`).toLocaleDateString();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AttendanceClient({
  tenant, cohorts, learners,
}: { tenant: string; cohorts: CohortResponse[]; learners: LearnerResponse[] }) {
  // ── Record-attendance state ──
  const [cohortId, setCohortId]       = useState(cohorts[0]?.id ?? 0);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [duration, setDuration]       = useState(120);
  const [csvRows, setCsvRows]         = useState<ZoomCsvRow[] | null>(null);
  const [matched, setMatched]         = useState<ZoomMatchedRow[]>([]);
  const [matchQuery, setMatchQuery]   = useState("");
  const [absent, setAbsent]           = useState<LearnerResponse[] | null>(null);
  const [recorded, setRecorded]       = useState<ZoomMatchedRow[]>([]);
  const [pending, start]              = useTransition();

  // ── Re-upload targeting ──
  const [reuploadTarget, setReuploadTarget] = useState<AttendanceResponse | null>(null);

  // ── History state ──
  const [history, setHistory]         = useState<AttendanceResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyView, setHistoryView] = useState<"sessions" | "learners">("sessions");
  const [historyQuery, setHistoryQuery] = useState("");

  // ── Sessions-view selection ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deletePending, startDelete]  = useTransition();

  // ── Learner duration inline-edit ──
  type EditEntry = { sessionId: number; learnerId: number; value: string };
  const [editEntry, setEditEntry]   = useState<EditEntry | null>(null);
  const [editPending, startEdit]    = useTransition();

  // ── Data helpers ──
  const fetchHistory = useCallback((cid: number) => {
    setHistoryLoading(true);
    getAttendanceByCohort(tenant, cid)
      .then(r => { if (r.ok) setHistory(r.data); })
      .finally(() => setHistoryLoading(false));
  }, [tenant]);

  useEffect(() => { if (cohortId) fetchHistory(cohortId); }, [cohortId, fetchHistory]);

  const cohortLearners = useMemo(
    () => learners.filter(l => l.cohortId === cohortId),
    [learners, cohortId],
  );
  const learnerById = (id: number) => cohortLearners.find(l => l.id === id);

  // ── Upload / match ──
  const upload = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/zoom-csv", { method: "POST", body: fd });
    if (!res.ok) { toast.error("Failed to parse CSV"); return; }
    const { rows } = await res.json() as { rows: ZoomCsvRow[] };
    setCsvRows(rows);
    setAbsent(null);
    setRecorded([]);
    setMatched(rows.map((r, idx) => ({
      idx, csvName: r.name, csvDuration: r.duration,
      ...autoMatch(r.name, cohortLearners),
    })));
  };

  const setMapping = (idx: number, learnerId: number | null) =>
    setMatched(prev => prev.map(r =>
      r.idx === idx ? { ...r, learnerId, kind: learnerId ? "manual" : "unmatched" } : r,
    ));

  const submit = () => start(async () => {
    const participants = matched
      .filter(r => r.learnerId !== null)
      .map(r => ({ learnerId: r.learnerId!, duration: r.csvDuration }));
    if (participants.length === 0) { toast.error("No matched participants to record"); return; }

    const body: AttendanceRequest = { cohortId, sessionDate, duration, participants };

    if (reuploadTarget) {
      const r = await updateAttendanceSession(tenant, reuploadTarget.id, body);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Session updated");
      setHistory(prev => prev.map(s => s.id === reuploadTarget.id ? r.data : s));
      setReuploadTarget(null);
    } else {
      const r = await recordAttendance(tenant, body);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Attendance recorded");
      fetchHistory(cohortId);
    }

    const presentIds = new Set(participants.map(p => p.learnerId));
    setRecorded(matched.filter(r => r.learnerId !== null));
    setAbsent(cohortLearners.filter(l => !presentIds.has(l.id)));
    setCsvRows(null);
    setMatched([]);
  });

  const pct = (min: number) => duration > 0 ? Math.round((min / duration) * 100) : 0;

  const mq = matchQuery.toLowerCase();
  const visibleMatched = mq
    ? matched.filter(r =>
        r.csvName.toLowerCase().includes(mq) ||
        (r.learnerId ? learnerById(r.learnerId)?.fullname.toLowerCase().includes(mq) : false),
      )
    : matched;
  const usedLearnerIds = new Set(matched.map(r => r.learnerId).filter(Boolean) as number[]);

  // ── Sessions-table data ──
  const sessionRows = useMemo(() =>
    [...history]
      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
      .map(s => {
        const present = s.participants.length;
        const absent  = Math.max(0, cohortLearners.length - present);
        const avgDur  = present > 0
          ? Math.round(s.participants.reduce((sum, p) => sum + p.duration, 0) / present)
          : 0;
        return { ...s, present, absent, avgDur };
      }),
    [history, cohortLearners],
  );

  const allSessionsSelected = sessionRows.length > 0 && sessionRows.every(r => selectedIds.has(r.id));
  const toggleAllSessions   = () => setSelectedIds(
    allSessionsSelected ? new Set() : new Set(sessionRows.map(r => r.id)),
  );
  const toggleSession = (id: number) => setSelectedIds(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  // ── Session bulk actions ──
  const startReupload = (session: AttendanceResponse) => {
    setReuploadTarget(session);
    setSessionDate(session.sessionDate);
    setDuration(session.duration);
    setCsvRows(null);
    setMatched([]);
    setSelectedIds(new Set());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteSessions = (ids: number[]) => startDelete(async () => {
    if (!confirm(`Delete ${ids.length} session(s)? This cannot be undone.`)) return;
    const results = await Promise.all(ids.map(id => deleteAttendanceSession(tenant, id)));
    const failed  = results.filter(r => !r.ok).length;
    if (failed) toast.error(`${failed} delete(s) failed`);
    else toast.success(`${ids.length} session(s) deleted`);
    const deleted = new Set(ids.filter((_, i) => results[i].ok));
    setHistory(prev => prev.filter(s => !deleted.has(s.id)));
    setSelectedIds(new Set());
  });

  // ── Learner duration edit ──
  const saveEdit = () => startEdit(async () => {
    if (!editEntry) return;
    const session = history.find(s => s.id === editEntry.sessionId);
    if (!session) return;
    const newDur = parseInt(editEntry.value, 10);
    if (isNaN(newDur) || newDur < 0) { toast.error("Invalid duration"); return; }
    const updatedParticipants = session.participants.map(p =>
      p.learnerId === editEntry.learnerId ? { ...p, duration: newDur } : p,
    );
    const r = await updateAttendanceSession(tenant, session.id, {
      cohortId: session.cohortId,
      sessionDate: session.sessionDate,
      duration: session.duration,
      participants: updatedParticipants,
    });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Duration updated");
    setHistory(prev => prev.map(s => s.id === session.id ? r.data : s));
    setEditEntry(null);
  });

  // ── Grouped learner history ──
  const grouped = useMemo(() => {
    if (!history.length || !cohortLearners.length) return [];
    const sessions = [...history].sort(
      (a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime(),
    );
    return cohortLearners.map(learner => {
      const rows = sessions.map(session => {
        const p   = session.participants.find(x => x.learnerId === learner.id);
        const dur = p?.duration ?? 0;
        const pct = p ? Math.round((dur / session.duration) * 100) : 0;
        return { session, present: !!p, duration: dur, pct };
      });
      const avgPct  = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0;
      const attended = rows.filter(r => r.present).length;
      return { learner, rows, avgPct, attended, total: sessions.length };
    });
  }, [history, cohortLearners]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Session details ── */}
      <Card>
        <CardHeader>
          <CardTitle>Session details</CardTitle>
          {reuploadTarget && (
            <p className="text-sm text-amber-600 mt-1">
              Re-uploading session from {fmtDate(reuploadTarget.sessionDate)} — upload a new CSV then click Record.
              <button className="ml-2 underline text-xs" onClick={() => setReuploadTarget(null)}>Cancel</button>
            </p>
          )}
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Cohort</Label>
            <select
              value={cohortId}
              onChange={e => { setCohortId(Number(e.target.value)); setCsvRows(null); setAbsent(null); setRecorded([]); setReuploadTarget(null); setSelectedIds(new Set()); }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input type="number" min={1} value={duration} onChange={e => setDuration(Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      {/* ── Upload ── */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Zoom participants CSV</CardTitle>
          <CardDescription>Names are fuzzy-matched to cohort learners — reversed tokens, parentheticals, and noise characters are handled automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          {cohortLearners.length === 0 && (
            <p className="text-sm text-amber-600 mb-3">
              No learners are assigned to this cohort — matching will not work until learners are added.
            </p>
          )}
          <Input type="file" accept=".csv" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
        </CardContent>
      </Card>

      {/* ── Match ── */}
      {csvRows && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Match participants ({matched.filter(r => r.learnerId).length}/{matched.length} matched)</CardTitle>
                <CardDescription className="mt-1">Fuzzy rows are pre-matched — confirm or pick a different learner.</CardDescription>
              </div>
              <Input className="max-w-xs" placeholder="Search participants…" value={matchQuery} onChange={e => setMatchQuery(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2">Name on Zoom</th>
                    <th>Learner</th>
                    <th className="text-right pr-4">Duration</th>
                    <th className="text-right pr-4">% of class</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMatched.map(r => {
                    const learner = r.learnerId ? learnerById(r.learnerId) : null;
                    const showZoomName = learner && r.csvName !== learner.fullname;
                    return (
                      <tr key={r.idx} className="border-t">
                        <td className="py-2 font-mono text-xs text-muted-foreground">{r.csvName}</td>
                        <td className="py-2">
                          {r.kind === "exact" || r.kind === "manual" ? (
                            <div>
                              <p className="font-medium">{learner?.fullname ?? "—"}</p>
                              {showZoomName && <p className="text-xs text-muted-foreground">{r.csvName}</p>}
                            </div>
                          ) : (
                            <select
                              value={r.learnerId ?? ""}
                              onChange={e => setMapping(r.idx, e.target.value ? Number(e.target.value) : null)}
                              className={`flex h-9 rounded-md border bg-background px-2 text-sm w-64 ${r.kind === "fuzzy" ? "border-amber-400" : "border-input"}`}
                            >
                              <option value="">— select learner —</option>
                              {cohortLearners.map(l => (
                                <option key={l.id} value={l.id} disabled={usedLearnerIds.has(l.id) && r.learnerId !== l.id}>
                                  {l.fullname}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="text-right pr-4 tabular-nums">{r.csvDuration} min</td>
                        <td className="text-right pr-4 tabular-nums">{pct(r.csvDuration)}%</td>
                        <td>
                          {r.kind === "exact"     && <Badge variant="default">Matched</Badge>}
                          {r.kind === "manual"    && <Badge>Manual</Badge>}
                          {r.kind === "fuzzy"     && <Badge className="bg-amber-500 text-white">Fuzzy</Badge>}
                          {r.kind === "unmatched" && <Badge variant="destructive">Unmatched</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Recording…" : reuploadTarget ? "Update session" : "Record attendance"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Results ── */}
      {absent && (
        <>
          {recorded.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recorded ({recorded.length})</CardTitle>
                <CardDescription>Duration shown as minutes and percentage of the {duration}-minute session.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-2">Learner</th>
                        <th className="text-right pr-4">Duration</th>
                        <th className="text-right">% of class</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recorded.map(r => {
                        const learner = r.learnerId ? learnerById(r.learnerId) : null;
                        const showZoomName = learner && r.csvName !== learner.fullname;
                        return (
                          <tr key={r.idx} className="border-t">
                            <td className="py-2">
                              <p className="font-medium">{learner?.fullname ?? "—"}</p>
                              {showZoomName && <p className="text-xs text-muted-foreground">{r.csvName}</p>}
                            </td>
                            <td className="text-right pr-4 tabular-nums">{r.csvDuration} min</td>
                            <td className="text-right tabular-nums">{pct(r.csvDuration)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Absent ({absent.length})</CardTitle></CardHeader>
            <CardContent>
              {absent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Everyone in the cohort attended.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {absent.map(l => (
                    <li key={l.id} className="py-2">
                      {l.fullname}
                      <span className="text-muted-foreground text-xs"> · {l.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Attendance history ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Attendance history</CardTitle>
              <CardDescription className="mt-1">All recorded sessions for this cohort.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                className="max-w-[200px]"
                placeholder={historyView === "sessions" ? "Search by date…" : "Search learners…"}
                value={historyQuery}
                onChange={e => setHistoryQuery(e.target.value)}
              />
              <div className="flex rounded-md border overflow-hidden">
                <button
                  className={`px-3 py-1.5 text-sm transition-colors ${historyView === "sessions" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                  onClick={() => { setHistoryView("sessions"); setHistoryQuery(""); }}
                >
                  Sessions
                </button>
                <button
                  className={`px-3 py-1.5 text-sm border-l transition-colors ${historyView === "learners" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                  onClick={() => { setHistoryView("learners"); setHistoryQuery(""); setSelectedIds(new Set()); }}
                >
                  Learners
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {historyLoading && <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>}

          {/* ── Sessions table view ── */}
          {!historyLoading && historyView === "sessions" && (
            <>
              {/* Bulk action bar */}
              {selectedIds.size > 0 && (
                <div className="mb-3 flex items-center gap-3 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  <span className="font-medium">{selectedIds.size} selected</span>
                  <div className="ml-auto flex gap-2">
                    {selectedIds.size === 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deletePending}
                        onClick={() => {
                          const id = [...selectedIds][0];
                          const session = history.find(s => s.id === id);
                          if (session) startReupload(session);
                        }}
                      >
                        Re-upload
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deletePending}
                      onClick={() => deleteSessions([...selectedIds])}
                    >
                      {deletePending ? "Deleting…" : selectedIds.size === 1 ? "Delete" : "Delete all"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                  </div>
                </div>
              )}

              {sessionRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions recorded for this cohort yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-3 w-8">
                          <input type="checkbox" checked={allSessionsSelected} onChange={toggleAllSessions} />
                        </th>
                        <th className="py-2">Date</th>
                        <th className="text-right pr-4">Duration</th>
                        <th className="text-right pr-4">Present</th>
                        <th className="text-right pr-4">Absent</th>
                        <th className="text-right">Avg duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionRows
                        .filter(s => !historyQuery || fmtDate(s.sessionDate).includes(historyQuery))
                        .map(s => (
                          <tr key={s.id} className="border-t hover:bg-muted/30">
                            <td className="py-2 pr-3">
                              <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSession(s.id)} />
                            </td>
                            <td className="py-2 font-medium">{fmtDate(s.sessionDate)}</td>
                            <td className="text-right pr-4 tabular-nums">{s.duration} min</td>
                            <td className="text-right pr-4 tabular-nums">
                              <span className="text-emerald-600 font-medium">{s.present}</span>
                            </td>
                            <td className="text-right pr-4 tabular-nums">
                              <span className={s.absent > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>{s.absent}</span>
                            </td>
                            <td className="text-right tabular-nums text-muted-foreground">
                              {s.avgDur > 0 ? `${s.avgDur} min` : "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Learners accordion view ── */}
          {!historyLoading && historyView === "learners" && (
            <>
              {grouped.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions recorded for this cohort yet.</p>
              ) : (
                <div className="space-y-1">
                  {grouped
                    .filter(({ learner }) => !historyQuery || learner.fullname.toLowerCase().includes(historyQuery.toLowerCase()))
                    .map(({ learner, rows, avgPct, attended, total }) => (
                      <details key={learner.id} className="rounded-lg border">
                        <summary className="cursor-pointer px-4 py-3 flex items-center justify-between list-none select-none">
                          <span className="font-medium">{learner.fullname}</span>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{attended}/{total} sessions</span>
                            <span className={`font-semibold tabular-nums ${avgPct >= 75 ? "text-emerald-600" : avgPct >= 50 ? "text-amber-600" : "text-destructive"}`}>
                              {avgPct}% avg
                            </span>
                          </div>
                        </summary>

                        <div className="border-t px-4 pb-4 pt-3">
                          <table className="w-full text-sm">
                            <thead className="text-left text-muted-foreground">
                              <tr>
                                <th className="py-2">Date</th>
                                <th>Status</th>
                                <th className="text-right pr-4">Duration</th>
                                <th className="text-right pr-4">% of class</th>
                                <th className="w-16"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map(row => {
                                const isEditing = editEntry?.sessionId === row.session.id && editEntry.learnerId === learner.id;
                                return (
                                  <tr key={row.session.id} className="border-t">
                                    <td className="py-2">{fmtDate(row.session.sessionDate)}</td>
                                    <td>
                                      {row.present
                                        ? <Badge variant="default" className="bg-emerald-600 text-white text-xs">Present</Badge>
                                        : <Badge variant="destructive" className="text-xs">Absent</Badge>}
                                    </td>
                                    <td className="text-right pr-4 tabular-nums">
                                      {isEditing ? (
                                        <Input
                                          type="number"
                                          min={0}
                                          className="h-7 w-20 text-right tabular-nums inline-flex"
                                          value={editEntry.value}
                                          onChange={e => setEditEntry({ ...editEntry, value: e.target.value })}
                                          autoFocus
                                        />
                                      ) : (
                                        row.duration > 0 ? `${row.duration} min` : "—"
                                      )}
                                    </td>
                                    <td className="text-right pr-4 tabular-nums">
                                      {isEditing ? "—" : row.pct > 0 ? `${row.pct}%` : "—"}
                                    </td>
                                    <td className="text-right">
                                      {row.present && (
                                        isEditing ? (
                                          <div className="flex gap-1 justify-end">
                                            <Button size="sm" className="h-7 px-2 text-xs" disabled={editPending} onClick={saveEdit}>
                                              {editPending ? "…" : "Save"}
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditEntry(null)}>
                                              ✕
                                            </Button>
                                          </div>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-xs text-muted-foreground"
                                            onClick={() => setEditEntry({ sessionId: row.session.id, learnerId: learner.id, value: String(row.duration) })}
                                          >
                                            Edit
                                          </Button>
                                        )
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <p className="mt-3 text-sm text-muted-foreground text-right">
                            Average attendance: <span className="font-semibold text-foreground">{avgPct}%</span>
                          </p>
                        </div>
                      </details>
                    ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
