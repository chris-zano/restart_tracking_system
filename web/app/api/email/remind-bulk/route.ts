import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSession } from "@/lib/auth";

export type BulkRemindPayload = {
  learnerName: string;
  learnerEmail: string;
  cohortName: string;
  upToWeekLabel: string;
  weeks: Array<{
    weekLabel: string;
    complete: boolean;
    incomplete: string[];
  }>;
};

function buildHtml(p: BulkRemindPayload): string {
  const weekRows = p.weeks
    .map(w => {
      if (w.complete) {
        return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${w.weekLabel}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#16a34a;">✅ All complete</p>
          </td>
        </tr>`;
      }
      const items = w.incomplete
        .map(t => `<li style="margin:3px 0;color:#374151;">⏳ ${t}</li>`)
        .join("");
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">
              ${w.weekLabel}
              <span style="font-weight:400;color:#6b7280;font-size:13px;">
                — ${w.incomplete.length} item${w.incomplete.length !== 1 ? "s" : ""} remaining
              </span>
            </p>
            <ul style="margin:6px 0 0;padding-left:18px;font-size:13px;">${items}</ul>
          </td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:32px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">

      <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">${p.cohortName}</p>
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">
        Progress summary up to ${p.upToWeekLabel}
      </h1>
      <p style="font-size:15px;color:#374151;margin:0 0 24px;">
        Hi <strong>${p.learnerName}</strong>, here's a summary of your progress across all weeks
        up to <strong>${p.upToWeekLabel}</strong>.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0">
        ${weekRows}
      </table>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">
        Keep going — you're making great progress! Reach out to your instructor if you have questions.
      </p>
      <p style="font-size:12px;color:#9ca3af;margin:0;">Sent on behalf of your instructor via Restart.</p>

    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
  }

  let payload: BulkRemindPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!payload.learnerEmail || !payload.learnerName || !payload.upToWeekLabel) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  const to =
    process.env.SHOULD_SEND_EMAILS === "true"
      ? payload.learnerEmail
      : "christian.solomon@amalitech.com";

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: `Progress reminder up to ${payload.upToWeekLabel} — ${payload.cohortName}`,
    html: buildHtml(payload),
  });

  if (error) {
    console.error("[remind-bulk]", error);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
