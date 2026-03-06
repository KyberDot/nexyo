import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as any;
  if (!user) return NextResponse.json({ ok: true }); // silent - don't reveal if email exists
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace("T", " ").split(".")[0];
  db.prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)").run(user.id, token, expires);
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${baseUrl}/reset-password?token=${token}`;
  const platform = db.prepare("SELECT mail_host, mail_from, app_name FROM platform_settings WHERE id = 1").get() as any;
  if (platform?.mail_host) {
    try {
      const nodemailer = require("nodemailer");
      const ps = db.prepare("SELECT * FROM platform_settings WHERE id=1").get() as any;
      const transporter = nodemailer.createTransporter({ host: ps.mail_host, port: ps.mail_port || 587, secure: !!ps.mail_secure, auth: { user: ps.mail_user, pass: ps.mail_pass } });
      await transporter.sendMail({ from: ps.mail_from || "Vexyo <noreply@vexyo.app>", to: email, subject: "Reset your password", html: `<p>Click below to reset your password. Link expires in 1 hour.</p><p><a href="${link}" style="background:#6366F1;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Reset Password</a></p>` });
    } catch {}
  }
  return NextResponse.json({ ok: true, link });
}
