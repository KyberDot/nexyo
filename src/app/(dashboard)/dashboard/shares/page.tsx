"use client";
import ModalPortal from "@/components/ModalPortal";
import { useState, useEffect } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";

export default function SharesPage() {
  const { subs } = useSubscriptions(); // Get your subs for the popup
  const [links, setLinks] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  
  // Selection states
  const [showSelector, setShowSelector] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const load = async () => {
    const res = await fetch("/api/shares");
    const data = await res.json();
    setLinks(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!label.trim() || selectedIds.length === 0) return;
    setCreating(true);
    const res = await fetch("/api/shares", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ label, subscription_ids: selectedIds }) // Send selected IDs
    });
    const data = await res.json();
    setLinks(prev => [data, ...prev]);
    setLabel("");
    setSelectedIds([]);
    setShowSelector(false);
    setCreating(false);
  };

  const deactivate = async (id: number) => {
    await fetch(`/api/shares/${id}`, { method: "DELETE" });
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Shared Links</h1>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>Share a read-only view of your subscriptions with family members.</p>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Create New Link</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" placeholder="Label (e.g. Partner, Family)" value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && setShowSelector(true)} />
          {/* Changed this button to trigger the popup first */}
          <button className="btn-primary" onClick={() => setShowSelector(true)} disabled={creating || !label.trim()}>Create</button>
        </div>
      </div>

      {links.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          {links.map((l, i) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < links.length - 1 ? "1px solid var(--border-color)" : "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{l.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, fontFamily: "monospace" }}>{baseUrl}/shared/{l.token}</div>
              </div>
              {/* Added View Button */}
              <a href={`${baseUrl}/shared/${l.token}`} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12, textDecoration: "none" }}>View</a>
              
              <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => navigator.clipboard.writeText(`${baseUrl}/shared/${l.token}`)}>Copy</button>
              <button style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 13 }} onClick={() => deactivate(l.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {links.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 14 }}>
          No shared links yet. Create one above.
        </div>
      )}

      {/* SELECTION POPUP */}
      {showSelector && (
        <ModalPortal>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowSelector(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth: 400, border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", maxHeight: "80vh" }}>
              <div style={{ padding: "20px", borderBottom: "1px solid var(--border-color)" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Select Subscriptions</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Which items should be included in "{label}"?</div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
                {subs.filter(s => s.active).map(s => (
                  <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", cursor: "pointer" }}>
                    <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
                    <div style={{ flex: 1, fontSize: 14 }}>{s.name}</div>
                  </label>
                ))}
              </div>
              <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn-ghost" onClick={() => setShowSelector(false)}>Cancel</button>
                <button className="btn-primary" onClick={create} disabled={selectedIds.length === 0 || creating}>Confirm & Create</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}