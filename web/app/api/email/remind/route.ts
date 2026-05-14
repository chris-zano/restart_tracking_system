import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSession } from "@/lib/auth";

export type RemindEmailPayload = {
  learnerName: string;
  learnerEmail: string;
  cohortName: string;
  weekLabel: string;
  completed: string[];
  incomplete: string[];
};

function buildHtml(p: RemindEmailPayload): string {
  const completedRows = p.completed.length
    ? p.completed.map((t) => `<li style="margin:4px 0;color:#16a34a;">✅ ${t}</li>`).join("")
    : `<li style="margin:4px 0;color:#6b7280;">None yet</li>`;

  const incompleteRows = p.incomplete.length
    ? p.incomplete.map((t) => `<li style="margin:4px 0;color:#374151;">⏳ ${t}</li>`).join("")
    : `<li style="margin:4px 0;color:#16a34a;">All done!</li>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:32px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">

      <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">${p.cohortName}</p>
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">
        ${p.weekLabel} — Progress reminder
      </h1>
      <p style="font-size:15px;color:#374151;margin:0 0 24px;">
        Hi <strong>${p.learnerName}</strong>, here's a quick look at your progress for <strong>${p.weekLabel}</strong>.
      </p>

      <h2 style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px;">
        Completed (${p.completed.length})
      </h2>
      <ul style="margin:0 0 24px;padding-left:18px;font-size:14px;">
        ${completedRows}
      </ul>

      <h2 style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px;">
        Still to complete (${p.incomplete.length})
      </h2>
      <ul style="margin:0 0 24px;padding-left:18px;font-size:14px;">
        ${incompleteRows}
      </ul>

      ${p.incomplete.length > 0
        ? `<p style="font-size:14px;color:#374151;margin:0;">Take some time this week to work through the remaining items — you've got this! 💪</p>`
        : `<p style="font-size:14px;color:#16a34a;margin:0;font-weight:600;">You've completed all targets for this week — great work! 🎉</p>`
      }

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        Sent on behalf of your instructor via Restart.
      </p>
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

  let payload: RemindEmailPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { learnerName, learnerEmail, cohortName, weekLabel, completed, incomplete } = payload;
  if (!learnerEmail || !learnerName || !weekLabel) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  const to = process.env.SHOULD_SEND_EMAILS === "true" ? learnerEmail : "christian.solomon@amalitech.com";
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: `${weekLabel} progress reminder — ${cohortName}`,
    html: buildHtml(payload),
  });

  if (error) {
    console.error("[remind-email]", error);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
