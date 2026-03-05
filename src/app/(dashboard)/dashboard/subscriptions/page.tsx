"use client";
import { useState } from "react";
import { useSettings } from "@/lib/SettingsContext";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { toMonthly, fmt, daysUntil, CATEGORIES, CYCLES, Subscription } from "@/types";
import SubModal from "@/components/SubModal";

export default function SubscriptionsPage() {
  const { subs, loading, add, update, remove } = useSubscriptions();
  const { currencySymbol } = useSettings();
  const [showModal, setShowModal] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterCycle, setFilterCycle] = useState("All");
  const [sortBy, setSortBy] = useState("name");

  const filtered = subs.filter(s => {
    if (filterCat !== "All" && s.category !== filterCat) return false;
    if (filterCycle !== "All" && s.cycle !== filterCycle) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "amount") return toMonthly(b.amount, b.cycle) - toMonthly(a.amount, a.cycle);
    if (sortBy === "date" && a.next_date && b.next_date) return new Date(a.next_date).getTime() - new Date(b.next_date).getTime();
    return a.name.localeCompare(b.name);
  });

  const totalMonthly = filtered.filter(s => s.active).reduce((a, s) => a + toMonthly(s.amount, s.cycle), 0);

  if (loading) return <div style={{ color: "var(--muted)" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>My Subscriptions</h1>
        <button className="btn-primary" onClick={() => { setEditSub(null); setShowModal(true); }}>+ Add</button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="input" style={{ flex: "1 1 200px" }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="select" value={filterCycle} onChange={e => setFilterCycle(e.target.value)}>
          <option value="All">All Cycles</option>
          {CYCLES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">Name</option>
          <option value="amount">Amount</option>
          <option value="date">Next Date</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 12, fontSize: 13, color: "var(--muted)" }}>
        <span>{filtered.length} subscriptions</span>
        <span>·</span>
        <span style={{ fontWeight: 600, color: "var(--text)" }}>${fmt(totalMonthly)}/mo</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0
          ? <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>No subscriptions found</div>
          : filtered.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < filtered.length - 1 ? "1px solid var(--border-color)" : "none", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              {s.icon && <img src={s.icon} width={36} height={36} style={{ borderRadius: 8, background: "#fff", padding: 2, objectFit: "contain", flexShrink: 0 }} alt={s.name} onError={e => (e.currentTarget.style.display = "none")} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, opacity: s.active ? 1 : 0.5 }}>{s.name}</span>
                  {s.trial && <span className="badge" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>Trial</span>}
                  {!s.active && <span className="badge" style={{ background: "var(--surface2)", color: "var(--muted)" }}>Paused</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  <span style={{ background: "var(--surface2)", borderRadius: 4, padding: "1px 6px", fontSize: 11 }}>{s.category}</span>
                  {" · "}{s.cycle}{" · "}{s.member}
                  {s.next_date && <span>{" · "}{s.next_date}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", marginRight: 8 }}>
                <div style={{ fontWeight: 700, opacity: s.active ? 1 : 0.5 }}>${s.amount}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>/{s.cycle === "monthly" ? "mo" : s.cycle === "yearly" ? "yr" : s.cycle}</div>
              </div>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: s.active ? "#6366F1" : "var(--border-color)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
                onClick={() => update(s.id, { active: !s.active })}>
                <div style={{ position: "absolute", top: 2, left: s.active ? 18 : 2, width: 16, height: 16, borderRadius: 8, background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </div>
              <button style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14, padding: 4 }} onClick={() => { setEditSub(s); setShowModal(true); }}>✏️</button>
              <button style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14, padding: 4 }} onClick={() => { if (confirm(`Delete ${s.name}?`)) remove(s.id); }}>🗑️</button>
            </div>
          ))}
      </div>

      {showModal && (
        <SubModal
          sub={editSub}
          onSave={async (data) => { editSub ? await update(editSub.id, data) : await add(data); setShowModal(false); setEditSub(null); }}
          onClose={() => { setShowModal(false); setEditSub(null); }}
        />
      )}
    </div>
  );
}
