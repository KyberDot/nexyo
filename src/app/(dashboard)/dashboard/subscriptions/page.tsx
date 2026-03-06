"use client";
import { useState, useEffect, useMemo } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { useSettings } from "@/lib/SettingsContext";
import { toMonthly, fmt, daysUntil, Subscription } from "@/types";
import SubModal from "@/components/SubModal";
import AttachmentsPanel from "@/components/AttachmentsPanel";
import { useSearch } from "@/app/(dashboard)/layout";

export default function SubscriptionsPage() {
  const { subs, loading, add, update, remove } = useSubscriptions();
  const { currencySymbol, convertToDisplay, categories } = useSettings();
  const { search } = useSearch();
  const [showModal, setShowModal] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [filterCat, setFilterCat] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [showInactive, setShowInactive] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/family-members").then(r => r.json()),
      fetch("/api/payment-methods").then(r => r.json()),
    ]).then(([fm, pm]) => {
      setFamilyMembers(Array.isArray(fm) ? fm : []);
      setPaymentMethods(Array.isArray(pm) ? pm.map((m: any) => ({ ...m, is_default: !!m.is_default })) : []);
    });
  }, []);

  const filtered = useMemo(() => {
    return subs
      .filter(s => s.type !== "bill")
      .filter(s => showInactive ? !s.active : s.active)
      .filter(s => filterCat === "All" || s.category?.includes(filterCat) || s.category === filterCat)
      .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const am = convertToDisplay(toMonthly(a.amount, a.cycle), a.currency);
        const bm = convertToDisplay(toMonthly(b.amount, b.cycle), b.currency);
        if (sortBy === "amount") return bm - am;
        if (sortBy === "date" && a.next_date && b.next_date) return new Date(a.next_date).getTime() - new Date(b.next_date).getTime();
        return a.name.localeCompare(b.name);
      });
  }, [subs, showInactive, filterCat, search, sortBy]);

  const allSubs = subs.filter(s => s.type !== "bill");
  const active = allSubs.filter(s => s.active);
  const monthly = active.reduce((a, s) => a + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency), 0);
  const upcoming7 = active.filter(s => s.next_date && daysUntil(s.next_date) <= 7 && daysUntil(s.next_date) >= 0).length;

  const markPaid = async (s: Subscription) => {
    if (!s.next_date) return;
    const d = new Date(s.next_date);
    const cycle = s.cycle;
    if (cycle === "monthly") d.setMonth(d.getMonth() + 1);
    else if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
    else if (cycle === "weekly") d.setDate(d.getDate() + 7);
    else if (cycle === "quarterly") d.setMonth(d.getMonth() + 3);
    else if (cycle === "6-months") d.setMonth(d.getMonth() + 6);
    else return;
    await update(s.id, { next_date: d.toISOString().split("T")[0] });
  };

  if (loading && subs.length === 0) return <div style={{ color: "var(--muted)", padding: 24 }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Subscriptions</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Manage all your recurring subscription payments</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditSub(null); setShowModal(true); }}>+ Add Subscription</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[["Monthly", `${currencySymbol}${fmt(monthly)}`, `${active.length} active`],["Yearly", `${currencySymbol}${fmt(monthly * 12)}`, "Annualized"],["Active", String(active.length), `${allSubs.length} total`],["Upcoming", String(upcoming7), "Next 7 days"]].map(([l,v,s]) => (
          <div key={l} className="card"><div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>{l}</div><div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s}</div></div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <select className="select" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ height: 34, fontSize: 13 }}>
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
        </select>
        <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: 34, fontSize: 13 }}>
          <option value="name">Sort: Name</option>
          <option value="amount">Sort: Amount</option>
          <option value="date">Sort: Next Date</option>
        </select>
        {/* Active / Inactive toggle */}
        <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 8, padding: 3, gap: 2 }}>
          <button onClick={() => setShowInactive(false)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: !showInactive ? "var(--surface)" : "transparent", color: !showInactive ? "var(--text)" : "var(--muted)", fontSize: 12, fontWeight: !showInactive ? 600 : 400, cursor: "pointer" }}>Active</button>
          <button onClick={() => setShowInactive(true)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: showInactive ? "var(--surface)" : "transparent", color: showInactive ? "var(--text)" : "var(--muted)", fontSize: 12, fontWeight: showInactive ? 600 : 400, cursor: "pointer" }}>Inactive</button>
        </div>
        {search && <span style={{ fontSize: 13, color: "var(--muted)" }}>"{search}"</span>}
        <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: "auto" }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 110px", padding: "9px 16px", borderBottom: "1px solid var(--border-color)", background: "var(--surface2)" }}>
          {["Service","Category","Payment","Amount","Next Billing",""].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>)}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{showInactive ? "No inactive subscriptions" : "No subscriptions yet"}</div>
            {!showInactive && <button className="btn-primary" onClick={() => setShowModal(true)}>Add Subscription</button>}
          </div>
        ) : filtered.map((s, i) => {
          const mo = toMonthly(s.amount, s.cycle);
          const displayMo = convertToDisplay(mo, s.currency);
          const days = s.next_date ? daysUntil(s.next_date) : null;
          const isOverdue = days !== null && days < 0;
          const isSoon = days !== null && days >= 0 && days <= 3;
          return (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 110px", padding: "11px 16px", borderBottom: i < filtered.length - 1 ? "1px solid var(--border-color)" : "none", alignItems: "center", opacity: s.active ? 1 : 0.55 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {s.icon ? <img src={s.icon} width={26} height={26} style={{ objectFit: "contain" }} alt="" onError={e => (e.currentTarget.style.display = "none")} /> : <span>📦</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  {s.member_name && <div style={{ fontSize: 11, color: "var(--accent)" }}>{s.member_name}</div>}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.category}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.payment_method_label || "—"}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{currencySymbol}{fmt(displayMo)}<span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 10 }}>/mo</span></div>
                {s.cycle !== "monthly" && <div style={{ fontSize: 10, color: "var(--muted)" }}>{s.cycle}</div>}
              </div>
              <div style={{ fontSize: 12 }}>
                {s.next_date ? <>
                  <div style={{ color: isOverdue ? "#EF4444" : isSoon ? "#F59E0B" : "var(--text)", fontWeight: isOverdue || isSoon ? 600 : 400 }}>
                    {isOverdue ? `${Math.abs(days!)}d ago` : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 10 }}>{s.next_date}</div>
                </> : <span style={{ opacity: 0.4 }}>—</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                {/* Active toggle */}
                <div onClick={() => update(s.id, { active: !s.active })} title={s.active ? "Deactivate" : "Activate"} style={{ width: 30, height: 17, borderRadius: 9, background: s.active ? "var(--accent)" : "var(--border-color)", cursor: "pointer", position: "relative", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: s.active ? 15 : 2, width: 13, height: 13, borderRadius: 7, background: "white", transition: "left 0.18s" }} />
                </div>
                {/* Mark paid */}
                {s.next_date && s.cycle !== "variable" && (
                  <button onClick={() => markPaid(s)} title="Mark as paid" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: "2px 3px", lineHeight: 1 }}>✓</button>
                )}
                <AttachmentsPanel subId={s.id} label="" />
                <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: "2px 3px" }} onClick={() => { setEditSub(s); setShowModal(true); }}>✏️</button>
                <button style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 13, padding: "2px 3px" }} onClick={() => { if (confirm(`Delete ${s.name}?`)) remove(s.id); }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
      {showModal && <SubModal sub={editSub} defaultType="subscription" familyMembers={familyMembers} paymentMethods={paymentMethods} onSave={async (data) => { editSub ? await update(editSub.id, data) : await add(data); setShowModal(false); setEditSub(null); }} onClose={() => { setShowModal(false); setEditSub(null); }} />}
    </div>
  );
}
