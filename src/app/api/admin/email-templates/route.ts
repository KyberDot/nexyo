import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

const DEFAULT_TEMPLATES = [
  {
    name: "magic_link",
    subject: "Sign in to {{appName}}",
    body_html: `<h1>Sign in to your account</h1>
<p>Click the button below to sign in. This link is valid for 15 minutes.</p>
<p><a href="{{link}}" style="background:#6366F1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Sign In Now</a></p>
<p style="color:#999;font-size:12px">Sent to {{email}} · If you didn't request this, you can safely ignore it.</p>`,
  },
  {
    name: "invite",
    subject: "You're invited to join {{appName}}",
    body_html: `<h1>You've been invited!</h1>
<p>You've been invited to join <strong>{{appName}}</strong>. Click below to create your account.</p>
<p><a href="{{link}}" style="background:#6366F1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Accept Invitation</a></p>`,
  },
  {
    name: "password_reset",
    subject: "Reset your {{appName}} password",
    body_html: `<h1>Reset your password</h1>
<p>We received a request to reset the password for your account. This link expires in 1 hour.</p>
<p><a href="{{link}}" style="background:#6366F1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Reset Password</a></p>`,
  },
  {
    name: "renewal_reminder",
    subject: "{{name}} renews in {{days}} days — {{appName}}",
    body_html: `<h1>Upcoming renewal</h1>
<p>Your subscription to <strong>{{name}}</strong> renews in <strong>{{days}} days</strong> on {{date}}.</p>
<p>Amount: <strong>{{amount}}</strong></p>`,
  },
];

async function isAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return false;
  return (getDb().prepare("SELECT role FROM users WHERE id = ?").get((s.user as any).id) as any)?.role === "admin";
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = getDb();
  // Seed defaults if not present
  for (const t of DEFAULT_TEMPLATES) {
    const exists = db.prepare("SELECT id FROM email_templates WHERE name = ?").get(t.name);
    if (!exists) db.prepare("INSERT INTO email_templates (name, subject, body_html) VALUES (?, ?, ?)").run(t.name, t.subject, t.body_html);
  }
  return NextResponse.json(db.prepare("SELECT * FROM email_templates ORDER BY id").all());
}

export async function PATCH(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, subject, body_html } = await req.json();
  getDb().prepare("UPDATE email_templates SET subject = ?, body_html = ?, updated_at = datetime('now') WHERE id = ?").run(subject, body_html, id);
  return NextResponse.json({ ok: true });
}
