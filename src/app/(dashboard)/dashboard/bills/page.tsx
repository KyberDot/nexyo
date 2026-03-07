"use client";
import { useSettings } from "@/lib/SettingsContext";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { toMonthly, fmt, daysUntil, Subscription } from "@/types";
import { useState, useEffect, useMemo } from "react";
import SubModal from "@/components/SubModal";
import AttachmentsPanel from "@/components/AttachmentsPanel";
import PaymentHistory from "@/components/PaymentHistory";
import { useSearch } from "@/app/(dashboard)/layout";
import { useToast } from "@/components/Toast";

function displayAmount(s: Subscription, convertToDisplay: (a: number, c: string) => number, currencySymbol: string) {
  if (s.cycle === "variable") return { main: "Variable", sub: "", isVariable: true };
  const conv = convertToDisplay(s.amount, s.currency);
  if (s.cycle === "yearly") return { main: `${currencySymbol}${fmt(conv)}`, sub: "/yr", isVariable: false };
  if (s.cycle === "6-months") return { main: `${currencySymbol}${fmt(conv)}`, sub: "/6m", isVariable: false };
  if (s.cycle === "quarterly") return { main: `${currencySymbol}${fmt(conv)}`, sub: "/qtr", isVariable: false };
  if (s.cycle === "weekly") return { main: `${currencySymbol}${fmt(conv)}`, sub: "/wk", isVariable: false };
  return { main: `${currencySymbol}${fmt(convertToDisplay(toMonthly(s.amount, s.cycle), s.currency))}`, sub: "/mo", isVariable: false };
}

const iconBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 26, borderRadius: 6,
  border: "1px solid var(--border-color)",
  background: "none", cursor: "pointer",
  color: "var(--muted)", fontSize: 13,
  padding: 0, flexShrink: 0, lineHeight: 1,
};
const iconBtnRed: React.CSSProperties = { ...iconBtn, color: "#EF4444", borderColor: "rgba(239,68,68,0.3)" };

export default function BillsPage() {
  const { currencySymbol, convertToDisplay, categories, settings, t } = useSettings();
  const { subs, loading, add, update, remove } = useSubscriptions();
  const { search } = useSearch();
  const [showModal, setShowModal] = useState(false);
  const [payHistorySub, setPayHistorySub] = useState<Subscription | null>(null);
  const { success, error: toastError } = useToast();
  const [editBill, setEditBill] = useState<Subscription | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [sortBy, setSortBy] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("bills_sortBy") || "date";
    return "date";
  });
  const [filterCat, setFilterCat] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("bills_filterCat") || "All";
    return "All";
  });
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

  const handleSortBy = (v: string) => { setSortBy(v); localStorage.setItem("bills_sortBy", v); };
  const handleFilterCat = (v: string) => { setFilterCat(v); localStorage.setItem("bills_filterCat", v); };

  const bills = useMemo(() => {
    return subs
      .filter(s => s.type === "bill")
      .filter(s => showInactive ? !s.active : s.active)
      .filter(s => filterCat === "All" || s.category?.includes(filterCat) || s.category === filterCat)
      .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "amount") return convertToDisplay(toMonthly(b.amount, b.cycle), b.currency) - convertToDisplay(toMonthly(a.amount, a.cycle), a.currency);
        if (sortBy === "date" && a.next_date && b.next_date) return new Date(a.next_date).getTime() - new Date(b.next_date).getTime();
        return a.name.localeCompare(b.name);
      });
  }, [subs, showInactive, filterCat, search, sortBy]);

  const allBills = subs.filter(s => s.type === "bill");
  const active = allBills.filter(b => b.active);
  const monthly = active.reduce((a, b) => a + convertToDisplay(toMonthly(b.amount, b.cycle), b.currency), 0);
  const overdue = active.filter(b => b.next_date && daysUntil(b.next_date) < 0).length;
  const dueSoon = active.filter(b => b.next_date && daysUntil(b.next_date) >= 0 && daysUntil(b.next_date) <= 3).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{t("bills")}</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Track all your recurring bills and due dates</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditBill(null); setShowModal(true); }}>+ {t("addBill")}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          ["Monthly Total", `${currencySymbol}${fmt(monthly)}`, `${active.length} active`],
          ["Yearly", `${currencySymbol}${fmt(monthly * 12)}`, "Annualized"],
          [t("overdueBills"), String(overdue), overdue > 0 ? t("needsAttention") : t("allGood")],
          [t("dueSoon"), String(dueSoon), t("within3Days")],
        ].map(([l, v, s], i) => (
          <div key={l} className="card">
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 5 }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: i === 2 && overdue > 0 ? "#EF4444" : i === 3 && dueSoon > 0 ? "#F59E0B" : "var(--text)" }}>{v}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <select className="select" value={filterCat} onChange={e => handleFilterCat(e.target.value)} style={{ height: 34, fontSize: 13 }}>
          <option value="All">{t("allCategories")}</option>
          {categories.map(c => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
        </select>
        <select className="select" value={sortBy} onChange={e => handleSortBy(e.target.value)} style={{ height: 34, fontSize: 13 }}>
          <option value="date">Sort: Due Date</option>
          <option value="name">Sort: Name</option>
          <option value="amount">Sort: Amount</option>
        </select>
        <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 8, padding: 3, gap: 2 }}>
          <button onClick={() => setShowInactive(false)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: !showInactive ? "var(--surface)" : "transparent", color: !showInactive ? "var(--text)" : "var(--muted)", fontSize: 12, fontWeight: !showInactive ? 600 : 400, cursor: "pointer" }}>Active</button>
          <button onClick={() => setShowInactive(true)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: showInactive ? "var(--surface)" : "transparent", color: showInactive ? "var(--text)" : "var(--muted)", fontSize: 12, fontWeight: showInactive ? 600 : 400, cursor: "pointer" }}>Inactive</button>
        </div>
        {search && <span style={{ fontSize: 13, color: "var(--muted)" }}>"{search}"</span>}
        <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: "auto" }}>{bills.length} bill{bills.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 136px", padding: "9px 16px", borderBottom: "1px solid var(--border-color)", background: "var(--surface2)" }}>
          {[t("service"), t("category"), t("payment"), t("amount"), t("dueDate"), ""].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
          ))}
        </div>
        {bills.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{showInactive ? "No inactive bills" : "No bills yet"}</div>
            {!showInactive && <button className="btn-primary" onClick={() => setShowModal(true)}>{t("addBill")}</button>}
          </div>
        ) : bills.map((b, i) => {
          const display = displayAmount(b, convertToDisplay, currencySymbol);
          const days = b.next_date ? daysUntil(b.next_date) : null;
          const isOverdue = days !== null && days < 0;
          const isSoon = days !== null && days >= 0 && days <= 3;
          const isDD = !!(b as any).direct_debit;
          return (
            <div key={b.id}
              style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 136px", padding: "11px 16px", borderBottom: i < bills.length - 1 ? "1px solid var(--border-color)" : "none", alignItems: "center", opacity: b.active ? 1 : 0.55 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>

              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {b.icon ? <img src={b.icon} width={26} height={26} style={{ objectFit: "contain" }} alt="" onError={e => (e.currentTarget.style.display = "none")} /> : <span>🧾</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                    {isDD && (
                      <span style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6", fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 800, flexShrink: 0, display: "inline-flex", alignItems: "center", lineHeight: 1 }}>DIRECT DEBIT</span>
                    )}
                    {b.trial && (
                      <span style={{ background: "#EF4444", color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 800, flexShrink: 0, display: "inline-flex", alignItems: "center", lineHeight: 1 }}>TRIAL</span>
                    )}
                  </div>
                  {b.member_name && <div style={{ fontSize: 11, color: "var(--accent)" }}>{b.member_name}</div>}
                </div>
              </div>

              <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.category}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.payment_method_label || "—"}</div>

              <div>
                {display.isVariable ? (
                  <div style={{ fontWeight: 400, fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>Variable</div>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{display.main}<span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 10, marginLeft: 2 }}>{display.sub}</span></div>
                    {b.currency && b.currency !== settings.currency && (
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{fmt(toMonthly(b.amount, b.cycle))} {b.currency}</div>
                    )}
                  </>
                )}
              </div>

              <div style={{ fontSize: 12 }}>
                {b.next_date ? <>
                  <div style={{ color: isOverdue ? "#EF4444" : isSoon ? "#F59E0B" : "var(--text)", fontWeight: isOverdue || isSoon ? 600 : 400 }}>
                    {isOverdue ? `${Math.abs(days!)}d ago` : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 10 }}>{b.next_date}</div>
                </> : <span style={{ opacity: 0.4 }}>—</span>}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end", flexShrink: 0 }}>
                <div onClick={async () => { await update(b.id, { active: !b.active }); success(b.active ? "Deactivated" : "Activated"); }} title={b.active ? "Deactivate" : "Activate"}
                  style={{ width: 28, height: 17, borderRadius: 9, background: b.active ? "var(--accent)" : "var(--border-color)", cursor: "pointer", position: "relative", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: b.active ? 13 : 2, width: 13, height: 13, borderRadius: 7, background: "white", transition: "left 0.18s" }} />
                </div>
                <button onClick={() => setPayHistorySub(b)} title="Payment history" style={iconBtn}>💰</button>
                <AttachmentsPanel subId={b.id} label="" />
                <button title="Edit" style={iconBtn} onClick={() => { setEditBill(b); setShowModal(true); }}>✏️</button>
                <button title="Delete" style={iconBtnRed} onClick={async () => { if (confirm(`Delete ${b.name}?`)) { await remove(b.id); success("Bill deleted"); } }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {payHistorySub && <PaymentHistory sub={payHistorySub} onClose={() => setPayHistorySub(null)} />}
      {showModal && (
        <SubModal sub={editBill} defaultType="bill" familyMembers={familyMembers} paymentMethods={paymentMethods}
          onSave={async (data: any) => {
            try {
              if (editBill) { await update(editBill.id, data); } else { await add(data); }
              success(editBill ? "Bill updated" : "Bill added");
              setShowModal(false); setEditBill(null);
            } catch { toastError("Failed to save bill"); }
          }}
          onClose={() => { setShowModal(false); setEditBill(null); }}
        />
      )}
    </div>
  );
}
