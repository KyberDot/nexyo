"use client";
import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"password" | "magic" | "forgot">("password");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState({ app_name: "Vexyo", logo: "" as string | undefined, primary_color: "#6366F1", allow_registration: true, magic_link_enabled: false });

  useEffect(() => {
    fetch("/api/platform").then(r => r.json()).then(d => {
      if (d && !d.error) setPlatform({ ...platform, ...d, allow_registration: !!d.allow_registration, magic_link_enabled: !!d.magic_link_enabled });
    }).catch(() => {});
    // Handle magic link token from URL
    const magic = params.get("magic");
    if (magic) {
      setLoading(true);
      signIn("magic-link", { token: magic, redirect: false }).then(res => {
        if (res?.ok) router.push("/dashboard");
        else { setError("Magic link is invalid or expired."); setLoading(false); }
      });
    }
  }, []);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    if (res?.ok) { router.push("/dashboard"); }
    else { setError("Invalid email or password"); setLoading(false); }
  };

  const submitMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setInfo("");
    const res = await fetch("/api/auth/magic-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email }) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Failed to send magic link"); return; }
    if (data.sent) setInfo("✓ Magic link sent! Check your email.");
    else if (data.link) {
      setInfo("Magic link created (no mail server configured):");
      setError(data.link);
    }
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setInfo("");
    const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email }) });
    const data = await res.json();
    setLoading(false);
    setInfo("If an account exists, a reset link has been sent to your email.");
    if (data.link) setError(`Reset link (no mail server): ${data.link}`);
  };

  const acc = platform.primary_color;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: acc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 12px", overflow: "hidden" }}>
            {platform.logo ? <img src={platform.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="logo" /> : "💰"}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>{platform.app_name}</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>
            {mode === "forgot" ? "Reset your password" : mode === "magic" ? "Sign in with a magic link" : "Sign in to your account"}
          </p>
        </div>

        {/* Mode tabs */}
        {mode !== "forgot" && (
          <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 10, padding: 3, gap: 2, marginBottom: 20 }}>
            <button onClick={() => setMode("password")} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: mode === "password" ? "var(--surface)" : "transparent", color: mode === "password" ? "var(--text)" : "var(--muted)", fontWeight: mode === "password" ? 600 : 400, fontSize: 13, cursor: "pointer" }}>🔑 Password</button>
            {platform.magic_link_enabled && <button onClick={() => setMode("magic")} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: mode === "magic" ? "var(--surface)" : "transparent", color: mode === "magic" ? "var(--text)" : "var(--muted)", fontWeight: mode === "magic" ? 600 : 400, fontSize: 13, cursor: "pointer" }}>✨ Magic Link</button>}
          </div>
        )}

        <div className="card" style={{ padding: 28 }}>
          {params.get("registered") && !info && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, fontSize: 13, color: "#10B981" }}>Account created! Sign in below.</div>}
          {info && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, fontSize: 13, color: "#10B981" }}>{info}</div>}
          {error && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 12, color: "#EF4444", wordBreak: "break-all" }}>{error}</div>}

          {loading && params.get("magic") ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)" }}>Signing you in...</div>
          ) : (
            <form onSubmit={mode === "magic" ? submitMagic : mode === "forgot" ? submitForgot : submitPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</label>
                <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              {mode === "password" && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
                  <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
                </div>
              )}
              {mode === "magic" && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -6 }}>We'll send a one-time sign-in link to your email.</p>}
              {mode === "forgot" && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -6 }}>Enter your email and we'll send a password reset link.</p>}
              <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4, background: acc }}>
                {loading ? "Please wait..." : mode === "magic" ? "Send Magic Link" : mode === "forgot" ? "Send Reset Link" : "Sign In"}
              </button>
            </form>
          )}

          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            {mode === "password" && (
              <button onClick={() => { setMode("forgot"); setError(""); setInfo(""); }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", textAlign: "center" }}>
                Forgot your password?
              </button>
            )}
            {mode !== "password" && (
              <button onClick={() => { setMode("password"); setError(""); setInfo(""); }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", textAlign: "center" }}>
                ← Back to password login
              </button>
            )}
            {platform.allow_registration && (
              <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
                No account? <Link href="/register" style={{ color: acc, fontWeight: 600, textDecoration: "none" }}>Create one</Link>
              </p>
            )}
            {!platform.allow_registration && <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted)" }}>Registration is by invitation only.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}><div style={{ color: "var(--muted)" }}>Loading...</div></div>}><LoginContent /></Suspense>;
}
