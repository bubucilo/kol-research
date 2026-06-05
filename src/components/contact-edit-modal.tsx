'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, Phone, DollarSign, MapPin, Tag, Briefcase, StickyNote, User } from 'lucide-react'

export type EditableContact = {
  id: string
  name: string | null
  contact: string | null
  rateIdr: number | null
  categories: string | null
  domisili: string | null
  tier: string | null
  scopeOfWork: string | null
  scopeQty: number | null
  remarks: string | null
  status: string | null
}

type Props = {
  contact: EditableContact | null
  onClose: () => void
  onSaved: (updated: EditableContact) => void
}

const STATUS_OPTIONS = [
  { value: 'cold', label: 'Cold' },
  { value: 'warm', label: 'Warm' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'deal', label: 'Deal' },
  { value: 'rejected', label: 'Rejected' },
]

const TIER_OPTIONS = ['Nano', 'Micro', 'Mid', 'Macro', 'Mega']

export function ContactEditModal({ contact, onClose, onSaved }: Props) {
  const [form, setForm] = useState<EditableContact | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (contact) {
      setForm({ ...contact })
      setError(null)
    }
  }, [contact])

  if (!contact || !form) return null

  const update = (field: keyof EditableContact, value: any) => {
    setForm((f) => (f ? { ...f, [field]: value } : f))
  }

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/contacts/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error?.message || 'Save failed')
        return
      }
      onSaved(data.data as EditableContact)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: '#0F1729', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h2 className="text-lg font-bold text-white">Edit KOL Contact</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              {error}
            </div>
          )}

          <Field icon={User} label="Name">
            <input
              type="text"
              value={form.name || ''}
              onChange={(e) => update('name', e.target.value || null)}
              placeholder="Display name"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field icon={Phone} label="Contact (WhatsApp)">
              <input
                type="text"
                value={form.contact || ''}
                onChange={(e) => update('contact', e.target.value || null)}
                placeholder="6281234567890"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]"
              />
            </Field>

            <Field icon={DollarSign} label="Rate (IDR)">
              <input
                type="number"
                value={form.rateIdr ?? ''}
                onChange={(e) =>
                  update('rateIdr', e.target.value === '' ? null : Number(e.target.value))
                }
                placeholder="500000"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]"
              />
            </Field>

            <Field icon={Tag} label="Categories / Niche">
              <input
                type="text"
                value={form.categories || ''}
                onChange={(e) => update('categories', e.target.value || null)}
                placeholder="Lifestyle, Fashion, etc."
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]"
              />
            </Field>

            <Field icon={MapPin} label="Domisili (Location)">
              <input
                type="text"
                value={form.domisili || ''}
                onChange={(e) => update('domisili', e.target.value || null)}
                placeholder="Jakarta"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]"
              />
            </Field>

            <Field label="Tier">
              <select
                value={form.tier || ''}
                onChange={(e) => update('tier', e.target.value || null)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#3B82F6] cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <option value="" style={{ background: '#0F1729' }}>—</option>
                {TIER_OPTIONS.map((t) => (
                  <option key={t} value={t} style={{ background: '#0F1729' }}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                value={form.status || 'cold'}
                onChange={(e) => update('status', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#3B82F6] cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value} style={{ background: '#0F1729' }}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field icon={Briefcase} label="Scope of Work">
              <input
                type="text"
                value={form.scopeOfWork || ''}
                onChange={(e) => update('scopeOfWork', e.target.value || null)}
                placeholder="IG Reels, TikTok, etc."
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]"
              />
            </Field>

            <Field label="Scope Qty">
              <input
                type="number"
                value={form.scopeQty ?? ''}
                onChange={(e) =>
                  update('scopeQty', e.target.value === '' ? null : Number(e.target.value))
                }
                placeholder="1"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]"
              />
            </Field>
          </div>

          <Field icon={StickyNote} label="Remarks">
            <textarea
              value={form.remarks || ''}
              onChange={(e) => update('remarks', e.target.value || null)}
              placeholder="Internal notes..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6] resize-none"
            />
          </Field>
        </div>

        <div
          className="flex items-center justify-end gap-3 p-5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-white/70 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg font-semibold text-white flex items-center gap-2 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #0066FF, #00AAFF)',
              boxShadow: '0 4px 12px rgba(0, 102, 255, 0.3)',
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon?: any
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/60 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </label>
      {children}
    </div>
  )
}
