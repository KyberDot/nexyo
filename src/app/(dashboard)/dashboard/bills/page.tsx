"use client";
import { useState, useEffect } from "react";
import { useSearch } from "@/app/(dashboard)/layout";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt, daysUntil, Subscription } from "@/types";
import SubModal from "@/components/SubModal";

export default function BillsPage() {
  const { currencySymbol, convertToDisplay } = useSettings();
  const [bills, setBills] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBill, setEditBill] = useState<Subscription | null>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [br, fmr, pmr] = await Promise.all([
      fetch("/api/bills").then(r => r.json()),
      fetch("/api/family-members").then(r => r.json()),
      fetch("/api/payment-methods").then(r => r.json()),
    ]);
    setBills(Array.isArray(br) ? br.map((b: any) => ({ ...b, trial: !!b.trial, active: !!b.active })) : []);
    setFamilyMembers(Array.isArray(fmr) ? fmr : []);
    setPaymentMethods(Array.isArray(pmr) ? pmr.map((m: any) => ({ ...m, is_default: !!m.is_default })) : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (data: any) => {
    if (editBill) {
      await fetch(`/api/bills/${editBill.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    } else {
      await fetch("/api/bills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    }
    await load(); setShowModal(false); setEditBill(null);
  };

  const remove = async (id: number, name: string) => {
    if (!confirm(`Delete bill "${name}"?`)) return;
    await fetch(`/api/bills/${id}`, { method: "DELETE" });
    setBills(prev => prev.filter(b => b.id !== id));
  };

  const toggle = async (b: Subscription) => {
    await fetch(`/api/bills/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !b.active }) });
    setBills(prev => prev.map(x => x.id === b.id ? { ...x, active: !x.active } : x));
  };

  const active = bills.filter(b => b.active);
  const monthlyTotal = active.reduce((a, b) => a + convertToDisplay(toMonthly(b.amount, b.cycle), b.currency), 0);

  if (loading) return <div style={{ color: "var(--muted)" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>My Bills</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Recurring bills like rent, electricity, internet</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditBill(null); setShowModal(true); }}>+ Add Bill</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <div className="card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Monthly Bills</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#F59E0B" }}>{currencySymbol}{fmt(monthlyTotal)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Yearly Total</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{currencySymbol}{fmt(monthlyTotal * 12)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Active Bills</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{active.length}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {bills.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🧾</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No bills yet</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 14 }}>Add recurring bills like rent, utilities, and phone plans</div>
            <button className="btn-primary" onClick={() => setShowModal(true)}>Add First Bill</button>
          </div>
        ) : bills.map((b, i) => {
          const monthly = convertToDisplay(toMonthly(b.amount, b.cycle), b.currency);
          const days = b.next_date ? daysUntil(b.next_date) : null;
          const overdue = days !== null && days < 0;
          return (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < bills.length - 1 ? "1px solid var(--border-color)" : "none", transition: "background 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: overdue ? "rgba(239,68,68,0.1)" : "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {b.icon ? <img src={b.icon} width={28} height={28} style={{ objectFit: "contain" }} alt={b.name} onError={e => (e.currentTarget.style.display = "none")} /> : <span style={{ fontSize: 16 }}>🧾</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, opacity: b.active ? 1 : 0.5 }}>{b.name}</span>
                  {overdue && <span className="badge" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>Overdue</span>}
                  {!b.active && <span className="badge" style={{ background: "var(--surface2)", color: "var(--muted)" }}>Paused</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, display: "flex", gap: 6 }}>
                  <span>{b.category}</span>
                  <span>·</span>
                  <span>{b.cycle}</span>
                  {b.next_date && <><span>·</span><span style={{ color: overdue ? "#EF4444" : "var(--muted)" }}>Due: {b.next_date}</span></>}
                </div>
              </div>
              <div style={{ textAlign: "right", marginRight: 8 }}>
                <div style={{ fontWeight: 700, color: "#F59E0B", opacity: b.active ? 1 : 0.5 }}>{currencySymbol}{fmt(monthly)}<span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 11 }}>/mo</span></div>
              </div>
              <div style={{ width: 34, height: 20, borderRadius: 10, background: b.active ? "#F59E0B" : "var(--border-color)", cursor: "pointer", position: "relative", flexShrink: 0 }} onClick={() => toggle(b)}>
                <div style={{ position: "absolute", top: 2, left: b.active ? 16 : 2, width: 16, height: 16, borderRadius: 8, background: "white", transition: "left 0.2s" }} />
              </div>
              <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 15, padding: 4 }} onClick={() => { setEditBill(b); setShowModal(true); }}>✏️</button>
              <button style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 15, padding: 4 }} onClick={() => remove(b.id, b.name)}>🗑️</button>
            </div>
          );
        })}
      </div>

      {showModal && (
        <SubModal
          sub={editBill}
          defaultType="bill"
          familyMembers={familyMembers}
          paymentMethods={paymentMethods}
          onSave={save}
          onClose={() => { setShowModal(false); setEditBill(null); }}
        />
      )}
    </div>
  );
}
