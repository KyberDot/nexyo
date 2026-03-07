"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect, useRef } from "react";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt, CURRENCIES, CURRENCY_SYMBOLS } from "@/types";
import { useSubscriptions } from "@/lib/useSubscriptions";
import AttachmentsPanel from "@/components/AttachmentsPanel"; //

const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank Account", icon: "🏦" },
  { value: "chequing", label: "Chequing Account", icon: "🏛️" },
  { value: "savings", label: "Savings Account", icon: "🪙" },
  { value: "crypto", label: "Crypto Wallet", icon: "🔐" },
  { value: "paypal", label: "PayPal", icon: "🅿️" },
  { value: "ewallet", label: "E-wallet", icon: "📱" },
  { value: "credit", label: "Credit Account", icon: "💳" },
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "other", label: "Other", icon: "💰" },
];

// Module-level cache for instant loading
let _methodsCache: any[] | null = null;
let _methodsMembers: any[] | null = null;
let _methodsTime = 0;

export default function PaymentsPage() {
  const { currencySymbol, convertToDisplay, settings } = useSettings();
  const { subs } = useSubscriptions();
  const [methods, setMethods] = useState<any[]>(_methodsCache || []);
  const [members, setMembers] = useState<any[]>(_methodsMembers || []);
  const [showModal, setShowModal] = useState(false);
  const [editMethod, setEditMethod] = useState<any>(null);
  const [form, setForm] = useState<any>({ 
    label: "", 
    account_type: "bank", 
    last4: "", 
    icon: "", 
    currency: settings.currency || "USD", 
    balance: "", 
    member_id: null, 
    is_default: false,
    attachments: [] //
  });
  const [saving, setSaving] = useState(false);
  const [iconMode, setIconMode] = useState<"auto" | "upload" | "url">("auto");
  const [balanceAction, setBalanceAction] = useState<{ id: number; type: "add" | "remove" } | null>(null);
  const [balanceDelta, setBalanceDelta] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (force = false) => {
    if (!force && _methodsCache && _methodsMembers && Date.now() - _methodsTime < 30000) return;
    const [mr, fmr] = await Promise.all([
      fetch("/api/payment-methods").then(r => r.json()), 
      fetch("/api/family-members").then(r => r.json())
    ]);
    const mArr = Array.isArray(mr) ? mr.map((m: any) => ({ ...m, is_default: !!m.is_default })) : [];
    const fArr = Array.isArray(fmr) ? fmr : [];
    _methodsCache = mArr; _methodsMembers = fArr; _methodsTime = Date.now();
    setMethods(mArr); setMembers(fArr);
  };

  useEffect(() => { load(); }, []);

  const setF = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const at = ACCOUNT_TYPES.find(a => a.value === form.account_type);
    const autoIcon = at?.icon || "💰";
    const body = {
      ...form,
      currency: form.currency || settings.currency || "USD",
      icon: iconMode === "auto" ? autoIcon : (form.icon || autoIcon),
      balance: Number(form.balance) || 0,
      is_default: !!form.is_default,
      attachments: form.attachments || [] //
    };

    if (editMethod) {
      await fetch(`/api/payment-methods/${editMethod.id}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(body) 
      });
    } else {
      await fetch("/api/payment-methods", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(body) 
      });
    }

    await load(true); 
    setShowModal(false); 
    setSaving(false);
  };

  const del = async (id: number, label: string) => {
    if (!confirm(`Delete "${label}"?`)) return;
    await fetch(`/api/payment-methods/${id}`, { method: "DELETE" });
    setMethods(p => { const n = p.filter(m => m.id !== id); _methodsCache = n; return n; });
  };

  const setDefault = async (id: number) => {
    await fetch(`/api/payment-methods/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_default: true }) });
    await load(true);
  };

  const updateBalance = async (method: any) => {
    const delta = Number(balanceDelta);
    if (!delta || !balanceAction) return;
    const newBalance = balanceAction.type === "add" ? (method.balance || 0) + delta : Math.max(0, (method.balance || 0) - delta);
    await fetch(`/api/payment-methods/${method.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ balance: newBalance }) });
    setBalanceDelta(""); setBalanceAction(null);
    await load(true);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const r = new FileReader(); 
    r.onload = e => setF("icon", e.target?.result as string); 
    r.readAsDataURL(file);
  };

  const getMethodSpend = (methodId: number) => subs.filter(s => s.active && s.payment_method_id === methodId).reduce((a, s) => a + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Wallet</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Manage your payment methods and balances</p>
        </div>
        <button className="btn-primary" onClick={() => { 
          setEditMethod(null); 
          setForm({ label: "", account_type: "bank", last4: "", icon: "", currency: settings.currency || "USD", balance: "", member_id: null, is_default: false, attachments: [] }); 
          setIconMode("auto"); 
          setShowModal(true); 
        }}>+ Add Account</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {methods.map(m => {
          const spend = getMethodSpend(m.id);
          const member = members.find(mb => mb.id === m.member_id);
          const sym = CURRENCY_SYMBOLS[m.currency] || m.currency || currencySymbol;
          const at = ACCOUNT_TYPES.find(a => a.value === m.account_type) || ACCOUNT_TYPES[ACCOUNT_TYPES.length - 1];
          const displayIcon = m.icon && (m.icon.startsWith("data:") || m.icon.startsWith("http")) ? null : (m.icon && m.icon.length <= 4 ? m.icon : at.icon);
          
          const isEditingThis = balanceAction?.id === m.id;

          return (
            <div key={m.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, overflow: "hidden", flexShrink: 0 }}>
                    {m.icon && (m.icon.startsWith("data:") || m.icon.startsWith("http")) ? (
                      <img src={m.icon} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                    ) : displayIcon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                      {m.label}
                      {m.attachments?.length > 0 && <span title="Has attachments" style={{ fontSize: 12, opacity: 0.6 }}>📎</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{at.label}{m.last4 ? ` •••• ${m.last4}` : ""}</div>
                  </div>
                </div>
                {m.is_default && <span style={{ background: "rgba(var(--accent-rgb),0.1)", color: "var(--accent)", fontSize: 10, borderRadius: 5, padding: "2px 6px", fontWeight: 700 }}>DEFAULT</span>}
              </div>

              <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Balance</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  {sym}{fmt(m.balance || 0)}
                  {m.currency && m.currency !== settings.currency && (
                    <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 8, fontWeight: 600 }}>
                      ≈ {currencySymbol}{fmt(convertToDisplay(m.balance || 0, m.currency))}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button onClick={() => setBalanceAction({ id: m.id, type: "add" })} style={{ flex: 1, padding: "5px", borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", color: "#10B981", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>+ Add</button>
                  <button onClick={() => setBalanceAction({ id: m.id, type: "remove" })} style={{ flex: 1, padding: "5px", borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", color: "#EF4444", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>− Remove</button>
                </div>
                {isEditingThis && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input className="input" type="number" step="0.01" placeholder="Amount" value={balanceDelta} onChange={e => setBalanceDelta(e.target.value)} style={{ flex: 1, height: 32, fontSize: 12 }} />
                    <button onClick={() => updateBalance(m)} className="btn-primary" style={{ padding: "0 10px", fontSize: 12, height: 32 }}>OK</button>
                    <button onClick={() => setBalanceAction(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}>✕</button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                {!m.is_default && <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => setDefault(m.id)}>Set Default</button>}
                <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => { 
                  setEditMethod(m); 
                  setForm({ ...m, attachments: m.attachments || [] }); 
                  setIconMode(m.icon?.startsWith("data:") ? "upload" : m.icon?.startsWith("http") ? "url" : "auto"); 
                  setShowModal(true); 
                }}>✏️ Edit</button>
                <button style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", marginLeft: "auto" }} onClick={() => del(m.id, m.label)}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: "var(--surface)", borderRadius: 14, width: "100%", maxWidth: 460, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid var(--border-color)" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700 }}>{editMethod ? "Edit Account" : "Add Account"}</div>
                <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}>✕</button>
              </div>
              
              <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Account Type Grid */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, display: "block" }}>Account Type *</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                    {ACCOUNT_TYPES.map(at => (
                      <button key={at.value} type="button" onClick={() => setF("account_type", at.value)} style={{ padding: "8px 6px", borderRadius: 8, border: `1.5px solid ${form.account_type === at.value ? "var(--accent)" : "var(--border-color)"}`, background: form.account_type === at.value ? "rgba(var(--accent-rgb),0.08)" : "var(--surface2)", color: form.account_type === at.value ? "var(--accent)" : "var(--muted)", fontSize: 11, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <span style={{ fontSize: 18 }}>{at.icon}</span>
                        <span style={{ fontWeight: 500 }}>{at.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Label *</label>
                  <input className="input" placeholder="e.g. Personal Card" value={form.label} onChange={e => setF("label", e.target.value)} />
                </div>

                {/* NEW: Brand Icon Section */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, display: "block" }}>Brand Icon / Logo URL</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid var(--border-color)", flexShrink: 0 }}>
                      {form.icon && (form.icon.startsWith("data:") || form.icon.startsWith("http")) ? (
                        <img src={form.icon} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                      ) : (
                        <span style={{ fontSize: 20 }}>{form.icon || "💳"}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {(["auto","upload","url"] as const).map(m => (
                          <button key={m} type="button" onClick={() => setIconMode(m)} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 10, border: iconMode === m ? "1px solid var(--accent)" : "1px solid var(--border-color)", background: iconMode === m ? "rgba(var(--accent-rgb), 0.1)" : "transparent", color: iconMode === m ? "var(--accent)" : "var(--muted)" }}>
                            {m.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      {iconMode === "url" && (
                        <input className="input" style={{ height: 32, fontSize: 12 }} placeholder="https://logo.clearbit.com/..." value={form.icon || ""} onChange={e => setF("icon", e.target.value)} />
                      )}
                      {iconMode === "upload" && (
                        <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} style={{ fontSize: 11 }} />
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label className="label">Currency</label>
                    <select className="select" value={form.currency} onChange={e => setF("currency", e.target.value)}>
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Balance</label>
                    <input className="input" type="number" step="0.01" value={form.balance || ""} onChange={e => setF("balance", e.target.value)} />
                  </div>
                </div>

                {/* NEW: Attachments Section */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, display: "block" }}>Attachments & Documents</label>
                  <AttachmentsPanel 
                    attachments={form.attachments || []} 
                    onChange={(newFiles: any) => setF("attachments", newFiles)} 
                  />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={!!form.is_default} onChange={e => setF("is_default", e.target.checked)} />
                  Set as default payment method
                </label>
              </div>

              <div style={{ padding: "13px 20px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={save} disabled={saving || !form.label}>{saving ? "Saving..." : "Save Account"}</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}