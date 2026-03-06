"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/lib/SettingsContext";

const COLORS = ["#6366F1","#8B5CF6","#EC4899","#EF4444","#F59E0B","#10B981","#3B82F6","#06B6D4","#84CC16","#F97316"];
const ICON_OPTIONS = ["💰","🔔","📊","💎","⚡","🚀","🌐","✨","💼","📱"];

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { platform, savePlatform } = useSettings();
  const [users, setUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"users" | "platform" | "mail" | "invites">("users");
  const [pForm, setPForm] = useState<any>({ ...platform });
  const [mailForm, setMailForm] = useState<any>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedMail, setSavedMail] = useState(false);
  const [testingMail, setTestingMail] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "loading") return;
    fetch("/api/admin/users").then(r => {
      if (r.status === 403) { router.push("/dashboard"); return r.json(); }
      return r.json();
    }).then(data => {
      if (Array.isArray(data)) setUsers(data);
      setLoading(false);
    });
    fetch("/api/admin/platform").then(r => r.json()).then(data => {
      if (!data.error) setMailForm({ mail_host: data.mail_host || "", mail_port: data.mail_port || 587, mail_user: data.mail_user || "", mail_pass: data.mail_pass || "", mail_from: data.mail_from || "", mail_secure: !!data.mail_secure });
    });
    fetch("/api/admin/invite").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setInvites(data);
    });
  }, [status]);

  useEffect(() => { setPForm({ ...platform }); }, [platform]);

  const updateUser = async (id: number, patch: any) => {
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  };

  const deleteUser = async (id: number, name: string) => {
    if (!confirm(`Delete user ${name}? All their data will be removed.`)) return;
    await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const savePlatformSettings = async () => {
    setSaving(true);
    await savePlatform(pForm);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const saveMailSettings = async () => {
    setSaving(true);
    await fetch("/api/platform", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mailForm) });
    setSaving(false); setSavedMail(true); setTimeout(() => setSavedMail(false), 2000);
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    const res = await fetch("/api/admin/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail }) });
    const data = await res.json();
    if (data.invite_url) {
      setInviteResult(data.invite_url);
      setInviteEmail("");
      fetch("/api/admin/invite").then(r => r.json()).then(d => { if (Array.isArray(d)) setInvites(d); });
    }
  };

  const handleImgUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "logo" | "favicon") => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPForm((p: any) => ({ ...p, [field]: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const Toggle = ({ value, onChange }: { value: boolean, onChange: (v: boolean) => void }) => (
    <div onClick={() => onChange(!value)} style={{ width: 38, height: 22, borderRadius: 11, background: value ? "var(--accent)" : "var(--border-color)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 19 : 3, width: 16, height: 16, borderRadius: 8, background: "white", transition: "left 0.2s" }} />
    </div>
  );

  if (loading) return <div style={{ color: "var(--muted)", padding: 24 }}>Loading admin portal...</div>;

  const tabs = [["users","👥 Users"],["platform","🎨 Platform"],["mail","📧 Mail Server"],["invites","✉️ Invites"]];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛡️</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin Portal</h1>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Manage users, branding, and platform configuration</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 10, padding: 4, alignSelf: "flex-start", flexWrap: "wrap" }}>
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: tab === key ? "var(--accent)" : "transparent", color: tab === key ? "white" : "var(--muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>{label}</button>
        ))}
      </div>

      {/* USERS */}
      {tab === "users" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700 }}>All Users ({users.length})</span>
          </div>
          {users.map((u, i) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < users.length - 1 ? "1px solid var(--border-color)" : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 99, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: 13, flexShrink: 0, overflow: "hidden" }}>
                {u.avatar ? <img src={u.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : u.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name || "—"}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{u.email} · {u.sub_count} subs · {new Date(u.created_at).toLocaleDateString()}</div>
              </div>
              <select value={u.role} onChange={e => updateUser(u.id, { role: e.target.value })} className="select" style={{ fontSize: 12, padding: "4px 8px", width: "auto" }}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <Toggle value={!!u.active} onChange={v => updateUser(u.id, { active: v })} />
              <button onClick={() => deleteUser(u.id, u.name)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14, padding: 4 }}>🗑️</button>
            </div>
          ))}
        </div>
      )}

      {/* PLATFORM */}
      {tab === "platform" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 580 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Logo & Favicon</div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>App Logo</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 12, background: pForm.primary_color + "20", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, overflow: "hidden" }}>
                    {pForm.logo ? <img src={pForm.logo} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="logo" /> : "💰"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleImgUpload(e, "logo")} />
                    <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => logoRef.current?.click()}>Upload Logo</button>
                    {pForm.logo && <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setPForm((p: any) => ({ ...p, logo: "" }))}>Remove</button>}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Favicon (browser tab icon)</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, overflow: "hidden" }}>
                    {pForm.favicon ? <img src={pForm.favicon} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="favicon" /> : "🔖"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input ref={faviconRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleImgUpload(e, "favicon")} />
                    <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => faviconRef.current?.click()}>Upload Favicon</button>
                    {pForm.favicon && <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setPForm((p: any) => ({ ...p, favicon: "" }))}>Remove</button>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>App Name</div>
            <input className="input" value={pForm.app_name || ""} onChange={e => setPForm((p: any) => ({ ...p, app_name: e.target.value }))} placeholder="Vexyo" />
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Primary Color</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setPForm((p: any) => ({ ...p, primary_color: c }))} style={{ width: 30, height: 30, borderRadius: 8, background: c, cursor: "pointer", border: pForm.primary_color === c ? "3px solid var(--text)" : "3px solid transparent" }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={pForm.primary_color || "#6366F1"} onChange={e => setPForm((p: any) => ({ ...p, primary_color: e.target.value }))} style={{ width: 36, height: 36, borderRadius: 6, border: "1px solid var(--border-color)", cursor: "pointer", background: "none" }} />
              <input className="input" value={pForm.primary_color || ""} onChange={e => setPForm((p: any) => ({ ...p, primary_color: e.target.value }))} style={{ fontFamily: "monospace", width: 110 }} />
              <div style={{ width: 36, height: 36, borderRadius: 8, background: pForm.primary_color }} />
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Registration</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Allow public registration</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>When off, only invited users can register</div>
              </div>
              <Toggle value={!!pForm.allow_registration} onChange={v => setPForm((p: any) => ({ ...p, allow_registration: v }))} />
            </div>
          </div>

          <button className="btn-primary" onClick={savePlatformSettings} disabled={saving} style={{ alignSelf: "flex-start" }}>
            {saving ? "Saving..." : saved ? "✓ Saved" : "Save Platform Settings"}
          </button>
        </div>
      )}

      {/* MAIL */}
      {tab === "mail" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>SMTP Mail Server</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Configure your mail server to send email notifications to users.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>SMTP Host</label>
                  <input className="input" placeholder="smtp.gmail.com" value={mailForm.mail_host || ""} onChange={e => setMailForm((p: any) => ({ ...p, mail_host: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>Port</label>
                  <input className="input" type="number" placeholder="587" value={mailForm.mail_port || ""} onChange={e => setMailForm((p: any) => ({ ...p, mail_port: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>SMTP Username</label>
                <input className="input" placeholder="your@gmail.com" value={mailForm.mail_user || ""} onChange={e => setMailForm((p: any) => ({ ...p, mail_user: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>SMTP Password / App Password</label>
                <input className="input" type="password" placeholder="••••••••••••" value={mailForm.mail_pass || ""} onChange={e => setMailForm((p: any) => ({ ...p, mail_pass: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "block" }}>From Address</label>
                <input className="input" placeholder="Vexyo <noreply@yourdomain.com>" value={mailForm.mail_from || ""} onChange={e => setMailForm((p: any) => ({ ...p, mail_from: e.target.value }))} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Use SSL/TLS</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Enable for port 465. Use STARTTLS for port 587.</div>
                </div>
                <Toggle value={!!mailForm.mail_secure} onChange={v => setMailForm((p: any) => ({ ...p, mail_secure: v }))} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" onClick={saveMailSettings} disabled={saving}>{saving ? "Saving..." : savedMail ? "✓ Saved" : "Save Mail Settings"}</button>
          </div>
        </div>
      )}

      {/* INVITES */}
      {tab === "invites" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Invite a User</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>Send an invite link to let someone create an account</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" type="email" placeholder="user@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} style={{ flex: 1 }} />
              <button className="btn-primary" onClick={sendInvite} disabled={!inviteEmail}>Generate Invite</button>
            </div>
            {inviteResult && (
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "#10B981", fontWeight: 600, marginBottom: 4 }}>Invite link generated:</div>
                <div style={{ fontSize: 12, fontFamily: "monospace", wordBreak: "break-all", color: "var(--muted)" }}>{inviteResult}</div>
                <button className="btn-ghost" style={{ fontSize: 11, marginTop: 8 }} onClick={() => navigator.clipboard.writeText(inviteResult)}>Copy Link</button>
              </div>
            )}
          </div>

          {invites.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)", fontWeight: 600, fontSize: 14 }}>Sent Invites</div>
              {invites.map((inv: any, i) => (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: i < invites.length - 1 ? "1px solid var(--border-color)" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{inv.email}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(inv.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className="badge" style={{ background: inv.used ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.1)", color: inv.used ? "#10B981" : "var(--accent)", fontSize: 11 }}>
                    {inv.used ? "Used" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
