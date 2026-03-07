"use client";
import { useState } from "react";
import AttachmentsPanel from "./AttachmentsPanel";

interface PaymentMethodModalProps {
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
}

export default function PaymentMethodModal({ onClose, onSave, initialData }: PaymentMethodModalProps) {
  const [formData, setFormData] = useState({
    label: initialData?.label || "",
    type: initialData?.type || "card",
    account_type: initialData?.account_type || "other",
    currency: initialData?.currency || "USD",
    balance: initialData?.balance || 0,
    last4: initialData?.last4 || "",
    brand: initialData?.brand || "",
    icon: initialData?.icon || "",
    is_default: initialData?.is_default || false,
    attachments: initialData?.attachments || [],
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 
    }}>
      <div className="card" style={{ 
        width: 500, maxHeight: '90vh', overflowY: 'auto', padding: 32, 
        background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border-color)' 
      }}>
        <h2 style={{ marginBottom: 24 }}>{initialData ? "Edit" : "Add"} Payment Method</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Brand Icon / URL Picker */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
              BRAND ICON URL
            </label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ 
                width: 48, height: 48, borderRadius: 10, background: 'var(--surface2)', 
                display: 'flex', alignItems: 'center', justifyContent: "center", overflow: 'hidden',
                border: '1px solid var(--border-color)' 
              }}>
                {formData.icon ? (
                  <img src={formData.icon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="icon" />
                ) : "💳"}
              </div>
              <input 
                type="text" 
                className="input" 
                placeholder="Paste image URL..." 
                value={formData.icon}
                onChange={e => setFormData({ ...formData, icon: e.target.value })}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">LABEL</label>
              <input 
                type="text" required className="input" placeholder="e.g. Revolut Card"
                value={formData.label}
                onChange={e => setFormData({ ...formData, label: e.target.value })}
              />
            </div>
            <div>
              <label className="label">CURRENCY</label>
              <select 
                className="input" 
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">CURRENT BALANCE</label>
            <input 
              type="number" step="0.01" className="input"
              value={formData.balance}
              onChange={e => setFormData({ ...formData, balance: Number(e.target.value) })}
            />
          </div>

          {/* Attachments Section using existing AttachmentsPanel */}
          <div>
            <label className="label">DOCUMENTS & ATTACHMENTS</label>
            <AttachmentsPanel 
              attachments={formData.attachments}
              onChange={(files: any) => setFormData({ ...formData, attachments: files })}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input 
              type="checkbox" id="is_default"
              checked={formData.is_default}
              onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
            />
            <label htmlFor="is_default" style={{ fontSize: 14 }}>Set as default payment method</label>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? "Saving..." : "Save Method"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}