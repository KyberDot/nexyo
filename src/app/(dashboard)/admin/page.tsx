"use client";
import { useState, useEffect } from "react";
import { useSettings } from "@/lib/SettingsContext";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div onClick={() => onChange(!value)} style={{ width: 42, height: 24, borderRadius: 12, background: value ? "var(--accent)" : "var(--surface2)", border: "1px solid var(--border-color)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
    <div style={{ position: "absolute", top: 3, left: value ? 20 : 3, width: 16, height: 16, borderRadius: 8, background: "white", transition: "left 0.18s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
  </div>
);

export default function AdminPage() {
  const { data: session, status } = useSession();
  const { userRole, platform, savePlatform, reloadProfile } = useSettings();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [tab, setTab] = useState<"users" | "platform" | "mail" | "invites">("users");
  const [platformForm, setPlatformForm] = useState<any>({});
  const [mailForm, setMailForm] = useState<any>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [mailTest, setMailTest] = useState<{ status: "idle" | "loading" | "ok" | "error"; msg: string }>({ status: "idle", msg: "" });

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (userRole && userRole !== "admin") { router.push("/dashboard"); return; }
    if (status !== "authenticated") return;
    fetch("/api/admin/users").then(r => r.json()).then(d => { if (Array.isArray(d)) setUsers(d); });
    fetch("/api/admin/platform").then(r => r.json()).then(d => {
      if (!d.error) {
        setPlatformForm({ app_name: d.app_name || "Vexyo", primary_color: d.primary_color || "#6366F1", allow_registration: !!d.allow_registration, magic_link_enabled: !!d.magic_link_enabled, logo: d.logo || "", favicon: d.favicon || "" });
        setMailForm({ mail_host: d.mail_host || "", mail_port: d.mail_port || 587, mail_user: d.mail_user || "", mail_pass: d.mail_pass || "", mail_from: d.mail_from || "", mail_secure: !!d.mail_secure });
      }
    });
    fetch("/api/admin/invite").then(r => r.json()).then(d => { if (Array.isArray(d)) setInvites(d); });
  }, [status, userRole]);

  if (status === "loading" || (status === "authenticated" && !userRole)) return <div style={{ color: "var(--muted)", padding: 24 }}>Loading...</div>;
  if (userRole !== "admin") return null;

  const saveMailSettings = async () => {
    setSaving(true);
    await fetch("/api/platform", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mailForm) });
    setSaving(false);
  };

  const testMail = async () => {
    setMailTest({ status: "loading", msg: "" });
    const res = await fetch("/api/admin/test-mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: session?.user?.email }) });
    const d = await res.json();
    setMailTest({ status: res.ok ? "ok" : "error", msg: res.ok ? d.message : d.error });
  };

  const savePlatformSettings = async () => {
    setSaving(true);
    await fetch("/api/platform", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(platformForm) });
    await savePlatform(platformForm);
    setSaving(false);
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    const res = await fetch("/api/admin/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail }) });
    const data = await res.json();
    setInviteResult(data.invite_url);
    setInviteEmail("");
    fetch("/api/admin/invite").then(r => r.json()).then(d => { if (Array.isArray(d)) setInvites(d); });
  };

  const cancelInvite = async (id: number) => {
    if (!confirm("Cancel this invite?")) return;
    await fetch("/api/admin/invite", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setInvites(p => p.filter((i: any) => i.id !== id));
  };

  const updateUser = async (id: number, changes: any) => {
    await fetch(`/api/admin/users`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...changes }) });
    setUsers(p => p.map((u: any) => u.id === id ? { ...u, ...changes } : u));
  };

  const ACCENT_COLORS = ["#6366F1","#8B5CF6","#3B82F6","#10B981","#F59E0B","#EF4444","#EC4899","#06B6D4","#F97316","#6B7280"];

  const handleLogoUpload = (field: "logo" | "favicon", file: File) => {
    const r = new FileReader();
    r.onload = e => setPlatformForm((p: any) => ({ ...p, [field]: e.target?.result as string }));
    r.readAsDataURL(file);
  };

  const tabs = [["users","👥 Users"],["platform","🎨 Platform"],["mail","📧 Mail Server"],["invites","✉️ Invites"]];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin Portal</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Manage users, branding, and platform settings</p>
      </div>

      <div style={{ display: "flex", gap: 4, background: "var(--surface2)", borderRadius: 10, padding: 4 }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)} style={{ flex: 1, padding: "8px", borderRadius: 7, border: "none", background: tab === id ? "var(--surface)" : "transparent", color: tab === id ? "var(--text)" : "var(--muted)", fontWeight: tab === id ? 600 : 400, fontSize: 13, cursor: "pointer" }}>{label}</button>
        ))}
      </div>

      {tab === "users" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: 15 }}>Users ({users.length})</div>
          {users.map((u: any, i: number) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < users.length - 1 ? "1px solid var(--border-color)" : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 99, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: 14, overflow: "hidden", flexShrink: 0 }}>
                {u.avatar ? <img src={u.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : (u.name || u.email)[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name || "—"}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{u.email} · {u.sub_count} subs</div>
              </div>
              <select value={u.role} onChange={e => updateUser(u.id, { role: e.target.value })} className="select" style={{ fontSize: 12, height: 30, padding: "0 8px" }}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <Toggle value={!!u.active} onChange={v => updateUser(u.id, { active: v })} />
            </div>
          ))}
        </div>
      )}

      {tab === "platform" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Branding</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>App Name</label>
                <input className="input" value={platformForm.app_name || ""} onChange={e => setPlatformForm((p: any) => ({ ...p, app_name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>Primary Color</label>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {ACCENT_COLORS.map(c => <div key={c} onClick={() => setPlatformForm((p: any) => ({ ...p, primary_color: c }))} style={{ width: 24, height: 24, borderRadius: 6, background: c, cursor: "pointer", border: platformForm.primary_color === c ? "2.5px solid var(--text)" : "2px solid transparent" }} />)}
                  <input type="color" value={platformForm.primary_color || "#6366F1"} onChange={e => setPlatformForm((p: any) => ({ ...p, primary_color: e.target.value }))} style={{ width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer", padding: 0 }} />
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              {(["logo", "favicon"] as const).map(field => (
                <div key={field}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, display: "block" }}>{field === "logo" ? "Logo" : "Favicon"}</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {platformForm[field] && <img src={platformForm[field]} style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 6 }} alt="" />}
                    <label style={{ cursor: "pointer", padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border-color)", fontSize: 12, color: "var(--muted)" }}>
                      Upload
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleLogoUpload(field, e.target.files[0])} />
                    </label>
                    {platformForm[field] && <button onClick={() => setPlatformForm((p: any) => ({ ...p, [field]: "" }))} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 13 }}>✕</button>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Allow Registration</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>When off, only invited users can register</div>
                </div>
                <Toggle value={!!platformForm.allow_registration} onChange={v => setPlatformForm((p: any) => ({ ...p, allow_registration: v }))} />
              </label>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Magic Link Login</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Allow sign in via one-click email link (requires mail server)</div>
                </div>
                <Toggle value={!!platformForm.magic_link_enabled} onChange={v => setPlatformForm((p: any) => ({ ...p, magic_link_enabled: v }))} />
              </label>
            </div>
            <button className="btn-primary" onClick={savePlatformSettings} disabled={saving} style={{ marginTop: 16 }}>
              {saving ? "Saving..." : "Save Platform Settings"}
            </button>
          </div>
        </div>
      )}

      {tab === "mail" && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Mail Server (SMTP)</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>Configure SMTP for magic links, invitations, and notifications. Save first, then test.</div>
          
          {mailTest.status !== "idle" && (
            <div style={{ marginBottom: 14, padding: "10px 14px", background: mailTest.status === "ok" ? "rgba(16,185,129,0.08)" : mailTest.status === "loading" ? "var(--surface2)" : "rgba(239,68,68,0.08)", border: `1px solid ${mailTest.status === "ok" ? "rgba(16,185,129,0.2)" : mailTest.status === "loading" ? "var(--border-color)" : "rgba(239,68,68,0.2)"}`, borderRadius: 8, fontSize: 13, color: mailTest.status === "ok" ? "#10B981" : mailTest.status === "loading" ? "var(--muted)" : "#EF4444" }}>
              {mailTest.status === "loading" ? "Testing connection..." : mailTest.msg}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>SMTP Host</label>
              <input className="input" placeholder="smtp.gmail.com" value={mailForm.mail_host || ""} onChange={e => setMailForm((p: any) => ({ ...p, mail_host: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Port</label>
              <input className="input" type="number" placeholder="587" value={mailForm.mail_port || ""} onChange={e => setMailForm((p: any) => ({ ...p, mail_port: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Username</label>
              <input className="input" placeholder="you@gmail.com" value={mailForm.mail_user || ""} onChange={e => setMailForm((p: any) => ({ ...p, mail_user: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>Password / App Password</label>
              <input className="input" type="password" placeholder="••••••••" value={mailForm.mail_pass || ""} onChange={e => setMailForm((p: any) => ({ ...p, mail_pass: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 4, display: "block" }}>From Address</label>
            <input className="input" placeholder={`${platformForm.app_name || "Vexyo"} <noreply@yourdomain.com>`} value={mailForm.mail_from || ""} onChange={e => setMailForm((p: any) => ({ ...p, mail_from: e.target.value }))} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <Toggle value={!!mailForm.mail_secure} onChange={v => setMailForm((p: any) => ({ ...p, mail_secure: v }))} />
            <span style={{ fontSize: 14 }}>Use SSL/TLS (port 465)</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" onClick={saveMailSettings} disabled={saving}>{saving ? "Saving..." : "Save Mail Settings"}</button>
            <button className="btn-ghost" onClick={testMail} disabled={mailTest.status === "loading" || !mailForm.mail_host}>
              {mailTest.status === "loading" ? "Testing..." : "🧪 Send Test Email"}
            </button>
          </div>
          <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--surface2)", borderRadius: 8, fontSize: 12, color: "var(--muted)" }}>
            <strong>Gmail:</strong> Use smtp.gmail.com, port 587, and an App Password (not your account password). Enable 2FA first, then generate an App Password in your Google Account settings.
          </div>
        </div>
      )}

      {tab === "invites" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Send Invite</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>Generate an invite link for a specific email address</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" type="email" placeholder="user@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} style={{ flex: 1 }} onKeyDown={e => e.key === "Enter" && sendInvite()} />
              <button className="btn-primary" onClick={sendInvite} disabled={!inviteEmail}>Generate Invite</button>
            </div>
            {inviteResult && (
              <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "#10B981", fontWeight: 600, marginBottom: 6 }}>✓ Invite created{mailForm.mail_host ? " and emailed!" : " (copy link below — no mail server configured)"}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", wordBreak: "break-all", background: "var(--surface2)", padding: "6px 10px", borderRadius: 6 }}>{inviteResult}</div>
                <button onClick={() => { navigator.clipboard.writeText(inviteResult); }} style={{ marginTop: 6, background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12 }}>📋 Copy link</button>
              </div>
            )}
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-color)", fontWeight: 700, fontSize: 15 }}>Sent Invites</div>
            {invites.length === 0 ? <div style={{ padding: "24px 18px", color: "var(--muted)", fontSize: 13 }}>No invites sent yet.</div>
              : invites.map((inv: any, i: number) => (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", borderBottom: i < invites.length - 1 ? "1px solid var(--border-color)" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.email}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Sent {new Date(inv.created_at).toLocaleDateString()}{inv.invited_by_name ? ` by ${inv.invited_by_name}` : ""}</div>
                  </div>
                  <span className="badge" style={{ background: inv.used ? "rgba(16,185,129,0.1)" : "rgba(var(--accent-rgb),0.1)", color: inv.used ? "#10B981" : "var(--accent)", fontSize: 11 }}>{inv.used ? "Used" : "Pending"}</span>
                  {!inv.used && <button onClick={() => cancelInvite(inv.id)} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "#EF4444", cursor: "pointer" }}>Cancel</button>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
