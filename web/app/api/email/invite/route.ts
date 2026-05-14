import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSession } from "@/lib/auth";

export type InviteEmailPayload = {
  recipientName: string;
  recipientEmail: string;
  username: string;
  tempPassword: string;
  loginUrl: string;
};

function buildHtml(p: InviteEmailPayload): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:32px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">

      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">
        You've been invited to Restart
      </h1>
      <p style="font-size:15px;color:#374151;margin:0 0 24px;">
        Hi <strong>${p.recipientName}</strong>, your instructor account has been created.
        Use the credentials below to sign in for the first time.
      </p>

      <div style="background:#f3f4f6;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;font-weight:600;">Your credentials</p>
        <p style="margin:0 0 4px;font-size:14px;color:#111827;"><strong>Username:</strong> ${p.username}</p>
        <p style="margin:0;font-size:14px;color:#111827;"><strong>Temporary password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;font-family:monospace;">${p.tempPassword}</code></p>
      </div>

      <a href="${p.loginUrl}" style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;margin-bottom:24px;">
        Sign in now →
      </a>

      <p style="font-size:14px;color:#374151;margin:0 0 24px;">
        You will be prompted to set a new password on your first sign-in.
        Keep your credentials safe and do not share them.
      </p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">Sent via Restart.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
  }

  let payload: InviteEmailPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [payload.recipientEmail],
    subject: "Your Restart instructor account is ready",
    html: buildHtml(payload),
  });

  if (error) {
    console.error("[invite-email]", error);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
