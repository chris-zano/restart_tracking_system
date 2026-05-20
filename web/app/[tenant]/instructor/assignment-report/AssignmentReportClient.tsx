"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Upload, HelpCircle, FileSpreadsheet, Mail, Loader2, CircleDot, Circle, CheckCircle2,
  Trash2, LayoutList, Table2, Check, Send, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateProgressReport, getSavedProgressReport, clearProgressReport } from "@/app/actions";
import type {
  GradebookRow, WeeklyTargetResponse, TrackResponse, CohortResponse, LearnerResponse,
  ProgressReportResponse, WeekProgress,
} from "@/lib/types";
import type { RemindEmailPayload } from "@/app/api/email/remind/route";
import type { BulkRemindPayload } from "@/app/api/email/remind-bulk/route";

// ─── Analysis loader ──────────────────────────────────────────────────────────

const ANALYSIS_STEPS = [
  "Parsing gradebook CSV",
  "Matching learners by email",
  "Resolving name variations",
  "Mapping assignments to weekly targets",
  "Calculating lab completion rates",
  "Calculating knowledge check rates",
  "Building per-learner progress report",
  "Finalising and saving results",
];

function AnalysisLoader() {
  const [stepIdx, setStepIdx] = useState(0);
  const [scanPos, setScanPos] = useState(0);
  const dirRef = useRef(1);

  useEffect(() => {
    const id = setInterval(() => setStepIdx(i => (i + 1) % ANALYSIS_STEPS.length), 800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setScanPos(p => {
        const next = p + dirRef.current * 1.8;
        if (next >= 100) { dirRef.current = -1; return 100; }
        if (next <= 0) { dirRef.current = 1; return 0; }
        return next;
      });
    }, 16);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-8">
      <div className="relative flex items-center justify-center">
        <div className="h-20 w-20 rounded-full border-4 border-primary/15" />
        <div className="absolute h-20 w-20 rounded-full border-t-4 border-primary animate-spin" />
        <div className="absolute">
          <FileSpreadsheet className="h-7 w-7 text-primary" />
        </div>
      </div>

      <div className="text-center space-y-1.5">
        <p className="text-base font-semibold tracking-tight">Analysing your gradebook</p>
        <p key={stepIdx} className="text-sm text-muted-foreground animate-in fade-in duration-500 min-h-[20px]">
          {ANALYSIS_STEPS[stepIdx]}
        </p>
      </div>

      <div className="w-72 space-y-1">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="absolute top-0 h-full w-1/3 rounded-full bg-primary"
            style={{ left: `${scanPos * 0.667}%`, transition: "left 16ms linear" }}
          />
        </div>
      </div>

      <div className="space-y-2.5 w-72">
        {ANALYSIS_STEPS.map((step, i) => (
          <div
            key={step}
            className={cn(
              "flex items-center gap-2.5 text-xs transition-all duration-300",
              i === stepIdx ? "text-primary" : "text-muted-foreground/60",
            )}
          >
            {i === stepIdx
              ? <CircleDot className="h-3 w-3 shrink-0 animate-pulse" />
              : <Circle className="h-3 w-3 shrink-0" />
            }
            <span className={i === stepIdx ? "font-medium" : ""}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Help dialog ──────────────────────────────────────────────────────────────

function HelpDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setOpen(true)}>
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
        <span className="sr-only">How to export from Canvas</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>How to export from Canvas</DialogTitle>
            <DialogDescription>Follow these steps to get the gradebook CSV.</DialogDescription>
          </DialogHeader>
          <ol className="text-sm space-y-3 list-none">
            {[
              ["Open your Canvas course", "Navigate to your course in Canvas LMS."],
              ["Go to Grades", "Click the Grades link in the course navigation."],
              ["Click Export", "Find the Export button in the top-right corner of the Grades page."],
              ["Choose Export Entire Gradebook", "This downloads a complete CSV with all assignments and student scores."],
              ["Upload the CSV here", "Come back here and upload the downloaded file."],
            ].map(([title, desc], i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium leading-tight">{title}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── CSV preview dialog ───────────────────────────────────────────────────────

type CsvPreview = { fileName: string; headers: string[]; rows: string[][]; totalRows: number };

function CsvPreviewDialog({
  preview,
  onConfirm,
  onCancel,
  confirming,
}: {
  preview: CsvPreview | null;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
}) {
  if (!preview) return null;
  const DISPLAY_ROWS = 100;
  const shown = preview.rows.slice(0, DISPLAY_ROWS);

  return (
    <Dialog open={!!preview} onOpenChange={open => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-[92vw] w-full h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            {preview.fileName}
          </DialogTitle>
          <DialogDescription>
            {preview.headers.length} columns · {preview.totalRows.toLocaleString()} rows
            {preview.totalRows > DISPLAY_ROWS && ` (showing first ${DISPLAY_ROWS})`}
            {" "}— review the data then confirm to run analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4">
          <table className="text-xs w-max border-collapse">
            <thead className="sticky top-0 bg-background z-10">
              <tr>
                {preview.headers.map((h, i) => (
                  <th
                    key={i}
                    className="border border-border px-2 py-1.5 text-left font-semibold bg-muted whitespace-nowrap max-w-[180px] truncate"
                    title={h}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                  {preview.headers.map((_, ci) => (
                    <td
                      key={ci}
                      className="border border-border px-2 py-1 whitespace-nowrap max-w-[180px] truncate text-muted-foreground"
                      title={row[ci] ?? ""}
                    >
                      {row[ci] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={onCancel} disabled={confirming}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={confirming} className="gap-2">
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {confirming ? "Starting analysis…" : "Confirm & Analyse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

type StatusFilter = "not-started" | "in-progress" | "almost-done" | "complete";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "not-started", label: "Not started" },
  { value: "in-progress", label: "In progress" },
  { value: "almost-done", label: "Almost done" },
  { value: "complete", label: "Complete" },
];

function weekStatus(done: number, total: number): StatusFilter | "no-data" {
  if (total === 0) return "no-data";
  if (done === 0) return "not-started";
  const pct = done / total;
  if (pct >= 1) return "complete";
  if (pct >= 0.8) return "almost-done";
  return "in-progress";
}

function cellColor(done: number, total: number): { text: string } | null {
  if (total === 0) return null;
  const pct = done / total;
  if (pct >= 1) return { text: "text-emerald-700" };
  if (pct >= 0.8) return { text: "text-emerald-600" };
  if (pct >= 0.4) return { text: "text-amber-700" };
  return { text: "text-red-600" };
}

function TableView({
  report,
  query,
}: {
  report: ProgressReportResponse;
  query: string;
}) {
  const weeks = report.learners[0]?.weeks ?? [];
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(null);

  const toggleWeek = (w: string) =>
    setSelectedWeeks(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]);
  const toggleStatus = (s: StatusFilter) =>
    setStatusFilter(prev => prev === s ? null : s);

  const hasFilters = selectedWeeks.length > 0 || statusFilter !== null;

  const queryFiltered = report.learners.filter(l =>
    !query ||
    (l.learnerDbName ?? l.gradebookName).toLowerCase().includes(query.toLowerCase()),
  );

  const filtered = statusFilter
    ? queryFiltered.filter(learner => {
        const weeksToCheck = selectedWeeks.length > 0
          ? learner.weeks.filter(w => selectedWeeks.includes(w.weekNumber))
          : learner.weeks;
        return weeksToCheck.some(w =>
          weekStatus(w.labsCompleted + w.kcCompleted, w.labsTotal + w.kcTotal) === statusFilter,
        );
      })
    : queryFiltered;

  return (
    <div className="space-y-3">
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Week</span>
          <div className="flex gap-1 flex-wrap">
            {weeks.map(w => {
              const active = selectedWeeks.includes(w.weekNumber);
              return (
                <button
                  key={w.weekNumber}
                  onClick={() => toggleWeek(w.weekNumber)}
                  className={cn(
                    "h-6 px-2 text-[11px] rounded border font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {w.weekNumber.replace("WEEK_", "W")}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-4 w-px bg-border hidden sm:block shrink-0" />

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Status</span>
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => toggleStatus(opt.value)}
                className={cn(
                  "h-6 px-2.5 text-[11px] rounded border font-medium transition-colors",
                  statusFilter === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-200" />
              &lt;40%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-200" />
              40–80%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-200" />
              &gt;80%
            </span>
          </div>
          {hasFilters && (
            <button
              onClick={() => { setSelectedWeeks([]); setStatusFilter(null); }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-md border">
        <table className="text-sm border-collapse w-max min-w-full">
          <thead className="bg-muted">
            <tr>
              <th className="sticky left-0 z-10 bg-muted border-b border-r border-border px-4 py-2.5 text-left font-semibold whitespace-nowrap min-w-[200px]">
                Learner
              </th>
              {weeks.map(w => {
                const hl = selectedWeeks.includes(w.weekNumber);
                return (
                  <th
                    key={w.weekNumber}
                    className={cn(
                      "border-b border-r border-border px-3 py-2.5 text-center font-semibold whitespace-nowrap text-xs transition-colors",
                      hl ? "bg-primary/15 text-primary" : "",
                    )}
                  >
                    {w.weekNumber.replace("_", " ")}
                  </th>
                );
              })}
              <th className="border-b border-border px-3 py-2.5 text-center font-semibold whitespace-nowrap text-xs">
                Overall
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={weeks.length + 2}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No learners match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((learner, ri) => {
                const name = learner.learnerDbName ?? learner.gradebookName;
                const totalItems = learner.weeks.reduce((s, w) => s + w.labsTotal + w.kcTotal, 0);
                const doneItems = learner.weeks.reduce((s, w) => s + w.labsCompleted + w.kcCompleted, 0);
                const rowBase = ri % 2 === 0 ? "bg-background" : "bg-muted/20";
                return (
                  <tr key={learner.gradebookName} className={rowBase}>
                    <td className={cn(
                      "sticky left-0 z-10 border-r border-b border-border px-4 py-2.5 font-medium whitespace-nowrap",
                      rowBase,
                    )}>
                      <div>
                        <p>{name}</p>
                        {!learner.matched && (
                          <p className="text-[10px] text-amber-600 font-normal">unmatched</p>
                        )}
                      </div>
                    </td>
                    {learner.weeks.map(week => {
                      const total = week.labsTotal + week.kcTotal;
                      const done = week.labsCompleted + week.kcCompleted;
                      const hl = selectedWeeks.includes(week.weekNumber);
                      const color = cellColor(done, total);
                      return (
                        <td
                          key={week.weekNumber}
                          className={cn(
                            "border-r border-b border-border px-3 py-2.5 text-center whitespace-nowrap transition-colors",
                            hl && "outline outline-2 outline-primary/40 outline-offset-[-2px]",
                          )}
                        >
                          {total === 0 ? (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          ) : done === total ? (
                            <span className={cn("inline-flex items-center justify-center", color?.text)}>
                              <Check className="h-4 w-4" strokeWidth={2.5} />
                            </span>
                          ) : (
                            <span className={cn("text-xs font-medium tabular-nums", color?.text ?? "text-muted-foreground")}>
                              {done}/{total}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-border px-3 py-2.5 text-center whitespace-nowrap">
                      {(() => {
                        const color = cellColor(doneItems, totalItems);
                        return totalItems === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : doneItems === totalItems ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">Complete</Badge>
                        ) : (
                          <span className={cn("text-xs font-medium tabular-nums", color?.text ?? "text-muted-foreground")}>
                            {doneItems}/{totalItems}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Bulk email dialog ────────────────────────────────────────────────────────

type SendState =
  | { phase: "idle" }
  | { phase: "sending"; current: number; total: number; failed: string[] }
  | { phase: "done"; sent: number; failed: string[] };

function BulkEmailDialog({
  open,
  onClose,
  report,
  allLearners,
}: {
  open: boolean;
  onClose: () => void;
  report: ProgressReportResponse;
  allLearners: LearnerResponse[];
}) {
  const weeks = report.learners[0]?.weeks ?? [];
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [sendState, setSendState] = useState<SendState>({ phase: "idle" });

  const weekIndex = selectedWeek ? weeks.findIndex(w => w.weekNumber === selectedWeek) : -1;
  const weeksUpTo = weekIndex >= 0 ? weeks.slice(0, weekIndex + 1) : [];

  const recipients = weeksUpTo.length > 0
    ? report.learners.map(learner => {
        const dbLearner = learner.learnerId ? allLearners.find(l => l.id === learner.learnerId) : null;
        const email = dbLearner?.email ?? null;
        const name = learner.learnerDbName ?? learner.gradebookName;

        const weekData = weeksUpTo.map(w => {
          const wd = learner.weeks.find(lw => lw.weekNumber === w.weekNumber);
          if (!wd) return null;
          const allItems = [...wd.knowledgeChecks, ...wd.labs];
          const total = wd.labsTotal + wd.kcTotal;
          const done = wd.labsCompleted + wd.kcCompleted;
          return {
            weekLabel: w.weekNumber.replace("_", " "),
            complete: total > 0 && done === total,
            incomplete: allItems.filter(i => !i.completed).map(i => i.title),
          };
        }).filter(Boolean) as BulkRemindPayload["weeks"];

        const hasIncomplete = weekData.some(w => !w.complete);
        return { name, email, weekData, hasIncomplete };
      })
    : [];

  const willSend = recipients.filter(r => r.hasIncomplete && r.email);
  const noEmail = recipients.filter(r => r.hasIncomplete && !r.email);

  const handleSend = async () => {
    if (!selectedWeek || willSend.length === 0) return;
    const upToWeekLabel = selectedWeek.replace("_", " ");
    setSendState({ phase: "sending", current: 0, total: willSend.length, failed: [] });

    const failed: string[] = [];
    for (let i = 0; i < willSend.length; i++) {
      const r = willSend[i];
      const payload: BulkRemindPayload = {
        learnerName: r.name,
        learnerEmail: r.email!,
        cohortName: report.cohortName,
        upToWeekLabel,
        weeks: r.weekData,
      };
      try {
        const res = await fetch("/api/email/remind-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) failed.push(r.name);
      } catch {
        failed.push(r.name);
      }
      setSendState({ phase: "sending", current: i + 1, total: willSend.length, failed });
    }

    setSendState({ phase: "done", sent: willSend.length - failed.length, failed });
  };

  const handleClose = () => {
    setSelectedWeek(null);
    setSendState({ phase: "idle" });
    onClose();
  };

  const isSending = sendState.phase === "sending";
  const isDone = sendState.phase === "done";

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send progress reminders</DialogTitle>
          <DialogDescription>
            Send one email per learner summarising all incomplete items up to the selected week.
          </DialogDescription>
        </DialogHeader>

        {isDone ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3">
              <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">
                {sendState.sent} email{sendState.sent !== 1 ? "s" : ""} sent successfully.
              </p>
            </div>
            {sendState.failed.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-start gap-3 rounded-md bg-red-50 border border-red-200 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">
                    {sendState.failed.length} failed to send:
                  </p>
                </div>
                <ul className="text-xs text-muted-foreground pl-2 space-y-0.5">
                  {sendState.failed.map(n => <li key={n}>· {n}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : isSending ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <p className="text-sm font-medium">
                Sending {sendState.current} of {sendState.total}…
              </p>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(sendState.current / sendState.total) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            {/* Week selector */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Send for weeks up to</p>
              <div className="flex flex-wrap gap-1.5">
                {weeks.map(w => {
                  const active = selectedWeek === w.weekNumber;
                  return (
                    <button
                      key={w.weekNumber}
                      onClick={() => setSelectedWeek(w.weekNumber)}
                      className={cn(
                        "h-7 px-3 text-xs rounded-md border font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {w.weekNumber.replace("_", " ")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            {selectedWeek && (
              <div className="rounded-md border bg-muted/30 divide-y divide-border text-sm">
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground">Will receive email</span>
                  <span className="font-semibold tabular-nums">{willSend.length}</span>
                </div>
                {noEmail.length > 0 && (
                  <div className="px-4 py-2.5 flex items-center justify-between text-amber-700">
                    <span>Skipped — no email on record</span>
                    <span className="font-semibold tabular-nums">{noEmail.length}</span>
                  </div>
                )}
                <div className="px-4 py-2.5 flex items-center justify-between text-muted-foreground">
                  <span>Already complete (no email needed)</span>
                  <span className="font-semibold tabular-nums">
                    {recipients.length - recipients.filter(r => r.hasIncomplete).length}
                  </span>
                </div>
              </div>
            )}

            {/* Learner list */}
            {willSend.length > 0 && (
              <div className="max-h-36 overflow-y-auto rounded-md border text-xs divide-y divide-border">
                {willSend.map(r => (
                  <div key={r.name} className="px-3 py-1.5 flex items-center justify-between">
                    <span>{r.name}</span>
                    <span className="text-muted-foreground">{r.email}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedWeek && willSend.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                All learners have completed everything up to {selectedWeek.replace("_", " ")}.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {isDone ? (
            <Button onClick={handleClose}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isSending}>
                Cancel
              </Button>
              {!isSending && (
                <Button
                  onClick={handleSend}
                  disabled={!selectedWeek || willSend.length === 0}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send {willSend.length > 0 ? `${willSend.length} email${willSend.length !== 1 ? "s" : ""}` : "emails"}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Accordion (list) view ────────────────────────────────────────────────────

function ListView({
  report,
  query,
  allLearners,
}: {
  report: ProgressReportResponse;
  query: string;
  allLearners: LearnerResponse[];
}) {
  const filtered = report.learners.filter(learner =>
    !query ||
    (learner.learnerDbName ?? learner.gradebookName).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      {filtered.map(learner => {
        const totalItems = learner.weeks.reduce((s, w) => s + w.labsTotal + w.kcTotal, 0);
        const doneItems = learner.weeks.reduce((s, w) => s + w.labsCompleted + w.kcCompleted, 0);
        const dbLearner = learner.learnerId
          ? allLearners.find(l => l.id === learner.learnerId)
          : null;
        const learnerName = learner.learnerDbName ?? learner.gradebookName;
        return (
          <details key={learner.gradebookName} className="rounded-lg border bg-card">
            <summary className="cursor-pointer px-4 py-3 flex items-center justify-between list-none">
              <div>
                <p className="font-medium">{learnerName}</p>
                {!learner.matched && (
                  <p className="text-xs text-amber-600">
                    Gradebook name: {learner.gradebookName} (unmatched)
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{doneItems}/{totalItems} completed</p>
            </summary>
            <div className="border-t px-4 pb-4 pt-3 space-y-4">
              {learner.weeks.map(week => (
                <WeekSection
                  key={week.weekNumber}
                  week={week}
                  learnerName={learnerName}
                  learnerEmail={dbLearner?.email ?? null}
                  cohortName={report.cohortName}
                />
              ))}
              {learner.weeks.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No weekly target data for this cohort&apos;s track.
                </p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type ViewMode = "list" | "table";

export function AssignmentReportClient({
  tenant,
  tracks,
  cohorts,
  learners: allLearners,
  targetsByTrack,
}: {
  tenant: string;
  tracks: TrackResponse[];
  cohorts: CohortResponse[];
  learners: LearnerResponse[];
  targetsByTrack: Record<number, WeeklyTargetResponse[]>;
}) {
  const [cohortId, setCohortId] = useState(cohorts[0]?.id ?? 0);
  const [report, setReport] = useState<ProgressReportResponse | null>(null);
  const [reportQuery, setReportQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirming, startConfirm] = useTransition();
  const [clearing, startClear] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadedCohortRef = useRef<number | null>(null);

  useEffect(() => {
    if (!cohortId || loadedCohortRef.current === cohortId) return;
    loadedCohortRef.current = cohortId;
    setReport(null);
    setReportQuery("");
    setLoadingSaved(true);
    getSavedProgressReport(tenant, cohortId)
      .then(r => { if (r.ok) setReport(r.data); })
      .finally(() => setLoadingSaved(false));
  }, [cohortId, tenant]);

  const handleFileSelected = (file: File) => {
    setShowUploadDialog(false);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
      const rows = result.data;
      if (rows.length < 2) { toast.error("CSV appears to be empty."); return; }
      setCsvPreview({
        fileName: file.name,
        headers: rows[0],
        rows: rows.slice(1),
        totalRows: rows.length - 1,
      });
      setPendingFile(file);
    };
    reader.readAsText(file);
  };

  const handleConfirmUpload = () => {
    if (!pendingFile) return;
    const file = pendingFile;
    setCsvPreview(null);
    setPendingFile(null);
    setAnalyzing(true);

    startConfirm(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload/gradebook", { method: "POST", body: fd });
        if (!res.ok) { toast.error("Failed to parse gradebook CSV"); return; }
        const { learners: gbRows }: { learners: GradebookRow[]; assignments: string[] } = await res.json();

        const cohortLearners = allLearners.filter(l => l.cohortId === cohortId);
        const students = gbRows.map(gb => {
          let matchedName = gb.learnerName;
          if (gb.email) {
            const byEmail = cohortLearners.find(
              l => l.email.toLowerCase() === gb.email!.toLowerCase().trim(),
            );
            if (byEmail) matchedName = byEmail.fullname;
          }
          if (matchedName === gb.learnerName) {
            const lower = gb.learnerName.toLowerCase().trim();
            const byName = cohortLearners.find(l => l.fullname.toLowerCase().trim() === lower);
            if (byName) matchedName = byName.fullname;
          }
          return {
            studentName: matchedName,
            email: gb.email,
            scores: Object.fromEntries(
              Object.entries(gb.scores).map(([k, v]) => [k, v == null ? "" : String(v)]),
            ),
          };
        });

        const r = await generateProgressReport(tenant, { cohortId, students });
        if (!r.ok) { toast.error(r.error); return; }
        setReport(r.data);
        setReportQuery("");
        toast.success(`Report generated for ${r.data.learners.length} learners`);
      } finally {
        setAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  const handleClearGradebook = () => {
    startClear(async () => {
      const r = await clearProgressReport(tenant, cohortId);
      if (!r.ok) { toast.error(r.error); return; }
      setReport(null);
      setReportQuery("");
      loadedCohortRef.current = cohortId;
      setShowClearConfirm(false);
      toast.success("Gradebook cleared");
    });
  };

  const selectedCohort = cohorts.find(c => c.id === cohortId);
  const trackId = selectedCohort?.trackId ?? null;

  return (
    <div className="space-y-6">
      {/* ── Header bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <select
            value={cohortId}
            disabled={cohorts.length === 0}
            onChange={e => {
              loadedCohortRef.current = null;
              setCohortId(Number(e.target.value));
              setReport(null);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full max-w-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cohorts.length === 0
              ? <option value="">No cohorts available</option>
              : cohorts.map(c => {
                  const track = tracks.find(t => t.id === c.trackId);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name}{track ? ` (${track.name})` : ""}
                    </option>
                  );
                })
            }
          </select>
          {cohorts.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No cohorts yet.{" "}
              <a href={`/${tenant}/instructor/cohorts`} className="underline text-primary">
                Create a cohort first
              </a>
              .
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {report?.uploadedAt && (
            <p className="text-xs text-muted-foreground hidden sm:block">
              Last uploaded: {new Date(report.uploadedAt).toLocaleString()}
            </p>
          )}
          {report && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setShowBulkEmail(true)}
                disabled={analyzing || loadingSaved}
              >
                <Send className="h-4 w-4" />
                Send Emails to Learners
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setShowClearConfirm(true)}
                disabled={analyzing || loadingSaved || clearing}
              >
                <Trash2 className="h-4 w-4" />
                Clear Gradebook
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setShowUploadDialog(true)}
            disabled={analyzing || loadingSaved || cohorts.length === 0}
          >
            <Upload className="h-4 w-4" />
            Upload Gradebook
          </Button>
          <HelpDialog />
        </div>
      </div>

      {/* ── Upload dialog ── */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Upload Canvas gradebook</DialogTitle>
            <DialogDescription>
              Select the CSV exported from Canvas. You&apos;ll be able to review it before analysis starts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="csv-upload">Gradebook CSV</Label>
            <Input
              id="csv-upload"
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Clear confirm dialog ── */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear gradebook?</DialogTitle>
            <DialogDescription>
              This will permanently delete the saved report for this cohort. You&apos;ll need to re-upload the gradebook to regenerate it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)} disabled={clearing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearGradebook} disabled={clearing} className="gap-2">
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {clearing ? "Clearing…" : "Clear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk email dialog ── */}
      {report && (
        <BulkEmailDialog
          open={showBulkEmail}
          onClose={() => setShowBulkEmail(false)}
          report={report}
          allLearners={allLearners}
        />
      )}

      {/* ── CSV preview dialog ── */}
      <CsvPreviewDialog
        preview={csvPreview}
        onConfirm={handleConfirmUpload}
        onCancel={() => { setCsvPreview(null); setPendingFile(null); }}
        confirming={confirming}
      />

      {/* ── No weekly targets warning ── */}
      {!report && !analyzing && !loadingSaved && trackId && (targetsByTrack[trackId]?.length ?? 0) === 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
          No weekly targets set for this cohort&apos;s track. Ask an admin to configure them first.
        </p>
      )}

      {/* ── Loading saved report ── */}
      {loadingSaved && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading saved report…
        </div>
      )}

      {/* ── Analysis loader ── */}
      {analyzing && <AnalysisLoader />}

      {/* ── Empty state ── */}
      {!report && !analyzing && !loadingSaved && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="rounded-full bg-muted p-5">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">No gradebook uploaded yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Export your Canvas gradebook as a CSV and upload it to see per-learner progress by week.
            </p>
          </div>
          <Button onClick={() => setShowUploadDialog(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Gradebook
          </Button>
        </div>
      )}

      {/* ── Report ── */}
      {report && !analyzing && (
        <>
          {/* Search + view toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="Search learners…"
              value={reportQuery}
              onChange={e => setReportQuery(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex items-center rounded-md border overflow-hidden ml-auto">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent",
                )}
                title="List view"
              >
                <LayoutList className="h-3.5 w-3.5" />
                List
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l",
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent",
                )}
                title="Table view"
              >
                <Table2 className="h-3.5 w-3.5" />
                Table
              </button>
            </div>
          </div>

          {viewMode === "table" ? (
            <TableView report={report} query={reportQuery} />
          ) : (
            <ListView report={report} query={reportQuery} allLearners={allLearners} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Week section ─────────────────────────────────────────────────────────────

function WeekSection({
  week, learnerName, learnerEmail, cohortName,
}: {
  week: WeekProgress;
  learnerName: string;
  learnerEmail: string | null;
  cohortName: string;
}) {
  const total = week.labsTotal + week.kcTotal;
  const done = week.labsCompleted + week.kcCompleted;
  const [sending, setSending] = useState(false);
  const weekLabel = week.weekNumber.replace("_", " ");

  const sendReminder = async () => {
    if (!learnerEmail) { toast.error("No email address for this learner."); return; }
    setSending(true);
    const allItems = [...week.knowledgeChecks, ...week.labs];
    const payload: RemindEmailPayload = {
      learnerName, learnerEmail, cohortName, weekLabel,
      completed: allItems.filter(i => i.completed).map(i => i.title),
      incomplete: allItems.filter(i => !i.completed).map(i => i.title),
    };
    try {
      const res = await fetch("/api/email/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to send email.");
      } else {
        toast.success(`Reminder sent to ${learnerEmail}`);
      }
    } catch {
      toast.error("Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">{weekLabel}</p>
        <span className="text-xs text-muted-foreground">{done}/{total}</span>
        {done === total && total > 0 && (
          <Badge className="bg-emerald-600 text-white text-xs">Complete</Badge>
        )}
      </div>
      <div className="grid gap-1 sm:grid-cols-2 text-xs">
        {[...week.knowledgeChecks, ...week.labs].map(item => (
          <div key={item.title} className="flex items-center gap-2">
            {item.completed
              ? <Badge variant="default" className="bg-emerald-600 text-[10px] px-1.5 py-0">✓</Badge>
              : item.foundInGradebook
                ? <Badge variant="secondary" className="text-[10px] px-1.5 py-0">…</Badge>
                : <Badge variant="outline" className="text-[10px] px-1.5 py-0">·</Badge>
            }
            <span className={!item.foundInGradebook ? "text-muted-foreground" : ""}>{item.title}</span>
          </div>
        ))}
      </div>
      {!(done === total && total > 0) && (
        <div className="flex items-center gap-3 pt-1">
          <Button
            size="sm" variant="outline"
            disabled={sending || !learnerEmail}
            onClick={sendReminder}
            className="gap-1.5 text-xs h-7"
          >
            <Mail className="h-3 w-3" />
            {sending ? "Sending…" : "Send Email"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {learnerEmail ? "Remind learner to complete weekly target." : "No email on record for this learner."}
          </p>
        </div>
      )}
    </div>
  );
}
