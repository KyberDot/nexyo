"use client";
import { useState, useEffect } from "react";
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
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/family-members").then(r => r.json()).then(d => setFamilyMembers(Array.isArray(d) ? d : []));
    fetch("/api/payment-methods").then(r => r.json()).then(d => setPaymentMethods(Array.isArray(d) ? d.map((m: any) => ({ ...m, is_default: !!m.is_default })) : []));
  }, []);

  const subSubs = subs.filter(s => s.type !== "bill");
  const filtered = subSubs.filter(s => {
    if (filterCat !== "All" && !s.category?.includes(filterCat) && s.category !== filterCat) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.category?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const am = convertToDisplay(toMonthly(a.amount, a.cycle), a.currency);
    const bm = convertToDisplay(toMonthly(b.amount, b.cycle), b.currency);
    if (sortBy === "amount") return bm - am;
    if (sortBy === "date" && a.next_date && b.next_date) return new Date(a.next_date).getTime() - new Date(b.next_date).getTime();
    return a.name.localeCompare(b.name);
  });

  const active = filtered.filter(s => s.active);
  const monthly = active.reduce((a, s) => a + convertToDisplay(toMonthly(s.amount, s.cycle), s.currency), 0);
  const upcoming7 = active.filter(s => s.next_date && daysUntil(s.next_date) <= 7 && daysUntil(s.next_date) >= 0).length;
  const getCatInfo = (catName: string) => categories.find(c => c.name === catName || catName?.includes(c.name)) || { icon: "📦", color: "#94A3B8" };

  if (loading) return <div style={{ color: "var(--muted)", padding: 24 }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>My Subscriptions</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Manage all your recurring subscription payments</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditSub(null); setShowModal(true); }}>+ Add Subscription</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[["Monthly", `${currencySymbol}${fmt(monthly)}`, `${active.length} active`],["Yearly", `${currencySymbol}${fmt(monthly * 12)}`,"Annualized"],["Active", String(active.length), `${subSubs.length} total`],["Upcoming", String(upcoming7), "Next 7 days"]].map(([l,v,s]) => (
          <div key={l} className="card"><div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>{l}</div><div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s}</div></div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <select className="select" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ height: 36, fontSize: 13 }}>
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
        </select>
        <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: 36, fontSize: 13 }}>
          <option value="name">Sort: Name</option>
          <option value="amount">Sort: Amount</option>
          <option value="date">Sort: Next Date</option>
        </select>
        {search && <span style={{ fontSize: 13, color: "var(--muted)" }}>Showing results for "{search}"</span>}
        <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: "auto" }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px", gap: 0, padding: "9px 16px", borderBottom: "1px solid var(--border-color)", background: "var(--surface2)" }}>
          {["Service","Category","Payment","Amount","Next Billing",""].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>)}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>No subscriptions found</div>
            <button className="btn-primary" onClick={() => setShowModal(true)}>Add Subscription</button>
          </div>
        ) : filtered.map((s, i) => {
          const mo = convertToDisplay(toMonthly(s.amount, s.cycle), s.currency);
          const days = s.next_date ? daysUntil(s.next_date) : null;
          const overdue = days !== null && days < 0;
          const soon = days !== null && days >= 0 && days <= 3;
          const catInfo = getCatInfo(s.category);
          const catName = s.category?.replace(/^[^\s]+ /, '') || s.category || "Other";
          return (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px", gap: 0, padding: "11px 16px", borderBottom: i < filtered.length - 1 ? "1px solid var(--border-color)" : "none", alignItems: "center", opacity: s.active ? 1 : 0.55, transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {s.icon ? <img src={s.icon} width={26} height={26} style={{ objectFit: "contain" }} alt={s.name} onError={e => (e.currentTarget.style.display = "none")} /> : <span>📦</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                    {s.trial && <span className="badge" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", fontSize: 9 }}>Trial</span>}
                    {s.member_name && <span style={{ fontSize: 10, color: "var(--muted)" }}>{s.member_name}</span>}
                  </div>
                </div>
              </div>
              <div><span className="badge" style={{ background: catInfo.color + "15", color: catInfo.color, fontSize: 10 }}>{catInfo.icon} {catName}</span></div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.payment_method_label || <span style={{ opacity: 0.4 }}>—</span>}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{currencySymbol}{fmt(mo)}<span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 10 }}>/mo</span></div>
                {s.cycle !== "monthly" && <div style={{ fontSize: 10, color: "var(--muted)" }}>{currencySymbol}{fmt(convertToDisplay(s.amount, s.currency))} {s.cycle}</div>}
              </div>
              <div style={{ fontSize: 12 }}>
                {s.next_date ? <div><div style={{ color: overdue ? "#EF4444" : soon ? "#F59E0B" : "var(--text)", fontWeight: overdue || soon ? 600 : 400 }}>{overdue ? "Overdue" : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}</div><div style={{ color: "var(--muted)", fontSize: 10 }}>{s.next_date}</div></div> : <span style={{ opacity: 0.4 }}>—</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div onClick={() => update(s.id, { active: !s.active })} style={{ width: 32, height: 18, borderRadius: 9, background: s.active ? "var(--accent)" : "var(--border-color)", cursor: "pointer", position: "relative", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: s.active ? 16 : 2, width: 14, height: 14, borderRadius: 7, background: "white", transition: "left 0.18s" }} />
                </div>
                <AttachmentsPanel subId={s.id} label="" />
                <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: "2px 4px" }} onClick={() => { setEditSub(s); setShowModal(true); }}>✏️</button>
                <button style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 13, padding: "2px 4px" }} onClick={() => { if (confirm(`Delete ${s.name}?`)) remove(s.id); }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
      {showModal && <SubModal sub={editSub} defaultType="subscription" familyMembers={familyMembers} paymentMethods={paymentMethods} onSave={async (data) => { editSub ? await update(editSub.id, data) : await add(data); setShowModal(false); setEditSub(null); }} onClose={() => { setShowModal(false); setEditSub(null); }} />}
    </div>
  );
}
