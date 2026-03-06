import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const db = getDb();
  const platform = db.prepare("SELECT * FROM platform_settings WHERE id = 1").get() as any;
  if (!platform?.magic_link_enabled) return NextResponse.json({ error: "Magic link login is not enabled" }, { status: 403 });
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString().replace("T", " ").split(".")[0];
  db.prepare("INSERT INTO magic_tokens (email, token, expires_at) VALUES (?, ?, ?)").run(email, token, expires);
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const link = `${baseUrl}/login?magic=${token}`;
  if (platform.mail_host) {
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: platform.mail_host,
        port: Number(platform.mail_port) || 587,
        secure: !!platform.mail_secure,
        auth: platform.mail_user ? { user: platform.mail_user, pass: platform.mail_pass } : undefined,
      });
      await transporter.sendMail({
        from: platform.mail_from || `${platform.app_name || "Vexyo"} <noreply@vexyo.app>`,
        to: email,
        subject: `Sign in to ${platform.app_name || "Vexyo"}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:auto"><h2>Sign in to ${platform.app_name || "Vexyo"}</h2><p>Click the button below to sign in. This link expires in 15 minutes.</p><p><a href="${link}" style="background:#6366F1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Sign In</a></p><p style="color:#999;font-size:12px">Or paste: ${link}</p></div>`,
      });
      return NextResponse.json({ ok: true, sent: true });
    } catch (e: any) {
      // Return link so admin can debug, but also show error
      return NextResponse.json({ ok: true, sent: false, link, mailError: e.message });
    }
  }
  return NextResponse.json({ ok: true, sent: false, link });
}
