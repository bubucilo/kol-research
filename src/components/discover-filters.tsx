'use client'

import { ChevronDown, Filter, X, Tag, MapPin, DollarSign, ListChecks } from 'lucide-react'

export type RangeKey = string

export type FilterState = {
  followerRanges: RangeKey[]
  postRanges: RangeKey[]
  viewRanges: RangeKey[]
  likeRanges: RangeKey[]
  erRanges: RangeKey[]
  category: string
  domisili: string
  minRate: string
  maxRate: string
  scope: string
}

export const EMPTY_FILTERS: FilterState = {
  followerRanges: [],
  postRanges: [],
  viewRanges: [],
  likeRanges: [],
  erRanges: [],
  category: '',
  domisili: '',
  minRate: '',
  maxRate: '',
  scope: '',
}

type Bucket = { key: string; label: string; min: number | null; max: number | null }

export const FOLLOWER_BUCKETS: Bucket[] = [
  { key: 'nano',  label: '< 10K',         min: 0,         max: 10_000 },
  { key: 'micro', label: '10K – 100K',    min: 10_000,    max: 100_000 },
  { key: 'mid',   label: '100K – 500K',   min: 100_000,   max: 500_000 },
  { key: 'macro', label: '500K – 1M',     min: 500_000,   max: 1_000_000 },
  { key: 'mega',  label: '1M+',           min: 1_000_000, max: null },
]

export const POST_BUCKETS: Bucket[] = [
  { key: 'few',    label: '< 50',  min: 0,   max: 50 },
  { key: 'active', label: '50 – 200',    min: 50,  max: 200 },
  { key: 'power',  label: '200 – 1K',    min: 200, max: 1_000 },
  { key: 'pro',    label: '1K+',         min: 1_000, max: null },
]

export const VIEW_BUCKETS: Bucket[] = [
  { key: 'low',   label: '< 1K',     min: 0,        max: 1_000 },
  { key: 'mid',   label: '1K – 10K', min: 1_000,    max: 10_000 },
  { key: 'high',  label: '10K – 100K', min: 10_000,  max: 100_000 },
  { key: 'viral', label: '100K – 1M', min: 100_000, max: 1_000_000 },
  { key: 'mega',  label: '1M+',      min: 1_000_000, max: null },
]

export const LIKE_BUCKETS: Bucket[] = [
  { key: 'low',   label: '< 100',     min: 0,      max: 100 },
  { key: 'mid',   label: '100 – 1K',  min: 100,    max: 1_000 },
  { key: 'high',  label: '1K – 10K',  min: 1_000,  max: 10_000 },
  { key: 'viral', label: '10K – 100K', min: 10_000, max: 100_000 },
  { key: 'mega',  label: '100K+',     min: 100_000, max: null },
]

export const ER_BUCKETS: Bucket[] = [
  { key: 'low',      label: '< 1%',   min: 0, max: 1 },
  { key: 'avg',      label: '1 – 3%', min: 1, max: 3 },
  { key: 'good',     label: '3 – 6%', min: 3, max: 6 },
  { key: 'excellent', label: '6%+',   min: 6, max: null },
]

type Group = {
  field: 'followerRanges' | 'postRanges' | 'viewRanges' | 'likeRanges' | 'erRanges'
  label: string
  buckets: Bucket[]
}

const RANGE_GROUPS: Group[] = [
  { field: 'followerRanges', label: 'Followers',  buckets: FOLLOWER_BUCKETS },
  { field: 'postRanges',     label: 'Posts',      buckets: POST_BUCKETS },
  { field: 'viewRanges',     label: 'Avg Views',  buckets: VIEW_BUCKETS },
  { field: 'likeRanges',     label: 'Avg Likes',  buckets: LIKE_BUCKETS },
  { field: 'erRanges',       label: 'Engagement', buckets: ER_BUCKETS },
]

type Props = {
  state: FilterState
  onChange: (next: FilterState) => void
  total: number
  matchCount: number | null
}

export function DiscoverFilters({ state, onChange, total, matchCount }: Props) {
  const rangeActiveCount =
    state.followerRanges.length +
    state.postRanges.length +
    state.viewRanges.length +
    state.likeRanges.length +
    state.erRanges.length

  const crmActiveCount =
    (state.category ? 1 : 0) +
    (state.domisili ? 1 : 0) +
    (state.minRate ? 1 : 0) +
    (state.maxRate ? 1 : 0) +
    (state.scope ? 1 : 0)

  const activeCount = rangeActiveCount + crmActiveCount
  const isFiltered = activeCount > 0

  const toggle = (field: Group['field'], key: string) => {
    const current = state[field]
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key]
    onChange({ ...state, [field]: next })
  }

  const selectAllInGroup = (field: Group['field']) => {
    onChange({ ...state, [field]: [] })
  }

  const setField = (field: keyof FilterState, value: string) => {
    onChange({ ...state, [field]: value })
  }

  const clearAll = () => onChange(EMPTY_FILTERS)

  return (
    <details
      className="tool-card rounded-xl mb-4 overflow-hidden group"
      open
    >
      <summary
        className="px-4 py-3 flex items-center justify-between cursor-pointer select-none list-none"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center gap-2.5">
          <Filter className="h-4 w-4 text-[#3B82F6]" />
          <span className="text-sm font-semibold text-white">Filters</span>
          {isFiltered && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: 'rgba(0,170,255,0.15)', color: '#00AAFF' }}
            >
              {activeCount} active
            </span>
          )}
          {matchCount !== null && (
            <span className="text-xs text-[#64748B]">
              {isFiltered
                ? `· ${matchCount.toLocaleString()} of ${total.toLocaleString()} match`
                : `· ${total.toLocaleString()} row${total === 1 ? '' : 's'}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isFiltered && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                clearAll()
              }}
              className="text-xs text-[#94A3B8] hover:text-white flex items-center gap-1 px-2 py-1 rounded transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
          <ChevronDown className="h-4 w-4 text-[#64748B] transition-transform group-open:rotate-180" />
        </div>
      </summary>

      <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {/* Range filters (existing) */}
        <div className="px-4 py-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-3">
            Engagement Metrics
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {RANGE_GROUPS.map((group) => {
              const selected = state[group.field]
              return (
                <div key={group.field}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      {group.label}
                    </span>
                    {selected.length > 0 && (
                      <button
                        onClick={() => selectAllInGroup(group.field)}
                        className="text-[10px] text-[#3B82F6] hover:text-[#60A5FA] font-semibold"
                      >
                        All
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors"
                      style={{
                        background: selected.length === 0 ? 'rgba(59,130,246,0.08)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.length === 0}
                        onChange={() => selectAllInGroup(group.field)}
                        className="h-3.5 w-3.5 rounded border-[rgba(255,255,255,0.15)] accent-[#3B82F6] cursor-pointer"
                      />
                      <span className={`text-xs ${selected.length === 0 ? 'text-white font-semibold' : 'text-[#94A3B8]'}`}>
                        All
                      </span>
                    </label>
                    {group.buckets.map((bucket) => {
                      const isChecked = selected.includes(bucket.key)
                      return (
                        <label
                          key={bucket.key}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors"
                          style={{
                            background: isChecked ? 'rgba(0,170,255,0.1)' : 'transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggle(group.field, bucket.key)}
                            className="h-3.5 w-3.5 rounded border-[rgba(255,255,255,0.15)] accent-[#3B82F6] cursor-pointer"
                          />
                          <span className={`text-xs ${isChecked ? 'text-white' : 'text-[#94A3B8]'}`}>
                            {bucket.label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CRM filters (new) */}
        <div
          className="px-4 py-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-3">
            CRM Data
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <TextField
              icon={Tag}
              label="Category / Niche"
              value={state.category}
              onChange={(v) => setField('category', v)}
              placeholder="Fashion, Lifestyle…"
            />
            <TextField
              icon={MapPin}
              label="Location"
              value={state.domisili}
              onChange={(v) => setField('domisili', v)}
              placeholder="Jakarta, Bandung…"
            />
            <TextField
              icon={ListChecks}
              label="Scope"
              value={state.scope}
              onChange={(v) => setField('scope', v)}
              placeholder="IG Reels, TikTok Video…"
            />
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">
                <DollarSign className="w-3.5 h-3.5" />
                Rate (IDR)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={state.minRate}
                  onChange={(e) => setField('minRate', e.target.value)}
                  placeholder="Min"
                  className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]"
                />
                <span className="text-white/40 text-xs">–</span>
                <input
                  type="number"
                  value={state.maxRate}
                  onChange={(e) => setField('maxRate', e.target.value)}
                  placeholder="Max"
                  className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </details>
  )
}

function TextField({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: any
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#3B82F6]"
      />
    </div>
  )
}
