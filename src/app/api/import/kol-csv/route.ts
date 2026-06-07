import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { parseCSV, parseFormattedNumber, normalizePlatform, usernameFromUrl } from '@/lib/utils'

export const maxDuration = 60
export const runtime = 'nodejs'

type ImportResult = {
  total: number
  imported: number
  updated: number
  skipped: number
  errors: { row: number; reason: string; data?: any }[]
}

type Rate = { scope: string; qty: number; rate: number }

const COLUMN_ALIASES: Record<string, string[]> = {
  rowNo: ['no', 'no.', '#', 'row', 'number'],
  name: ['name', 'nama', 'kol name', 'creator name'],
  profileUrl: ['link profile', 'profile url', 'url', 'link', 'profile'],
  platform: ['channel', 'platform', 'source'],
  categories: ['categories', 'category', 'niche', 'kategori'],
  followers: ['followers', 'follower', 'foll', 'pengikut'],
  tier: ['tier', 'level', 'size'],
  erPercent: ['er %', 'er%', 'er', 'engagement rate', 'engagement %'],
  avgViews: ['avg views', 'average views', 'views', 'view'],
  gmv: ['gmv', 'revenue'],
  scopeQty: ['scope qty', 'qty', 'quantity'],
  scopeOfWork: ['scope of work', 'scope', 'sow', 'konten'],
  rateIdr: ['rate', 'price', 'harga', 'fee', 'rate (idr)'],
  remarks: ['remarks', 'notes', 'catatan', 'note'],
  domisili: ['domisili', 'location', 'city', 'kota', 'lokasi'],
  contact: ['contact', 'phone', 'whatsapp', 'wa', 'hp', 'no hp', 'contact number'],
}

function findColumnIndex(headers: string[], target: string): number {
  const aliases = COLUMN_ALIASES[target] || [target.toLowerCase()]
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim()
    if (aliases.includes(h)) return i
  }
  return -1
}

function pickPrimaryRate(rates: Rate[] | null | undefined): number | null {
  if (!rates || rates.length === 0) return null
  const first = rates.find((r) => r.rate > 0) || rates[0]
  return first.rate || null
}

/**
 * Merge CSV rates into existing rates array.
 * Default mode: append new scopes (don't update existing scopes' rates).
 * Overwrite mode handled separately by replacing the array.
 */
function mergeRates(existing: Rate[] | null | undefined, incoming: Rate[]): Rate[] {
  const base = existing && existing.length > 0 ? [...existing] : []
  for (const inc of incoming) {
    if (!inc.scope && !(inc.rate > 0)) continue // skip empty rows
    const idx = base.findIndex((r) => r.scope === inc.scope)
    if (idx >= 0) {
      // Default merge: keep existing rate unless CSV has one and existing is 0
      if (!(base[idx].rate > 0) && inc.rate > 0) {
        base[idx] = { ...base[idx], rate: inc.rate, qty: inc.qty || base[idx].qty }
      }
    } else {
      base.push(inc)
    }
  }
  return base
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const overwrite = formData.get('overwrite') === 'true'

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } },
        { status: 400 }
      )
    }

    const text = await file.text()
    const { headers, rows } = parseCSV(text)

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'EMPTY_FILE', message: 'CSV has no data rows' } },
        { status: 400 }
      )
    }

    const colIdx: Record<string, number> = {}
    for (const target of Object.keys(COLUMN_ALIASES)) {
      colIdx[target] = findColumnIndex(headers, target)
    }

    const missing: string[] = []
    if (colIdx.profileUrl < 0) missing.push('Link Profile / profileUrl')
    if (colIdx.platform < 0) missing.push('Channel / platform')
    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_COLUMNS',
            message: `Required columns not found: ${missing.join(', ')}. Found: ${headers.join(', ')}`,
          },
        },
        { status: 400 }
      )
    }

    const get = (row: string[], key: string): string => {
      const i = colIdx[key]
      return i >= 0 && i < row.length ? row[i] : ''
    }

    const supabase = getClient()
    const result: ImportResult = {
      total: rows.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    }

    const BATCH_SIZE = 50
    let batch: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      try {
        const profileUrl = get(row, 'profileUrl')
        if (!profileUrl) {
          result.skipped++
          result.errors.push({ row: rowNum, reason: 'Missing profile URL' })
          continue
        }

        const { username, platform: urlPlatform } = usernameFromUrl(profileUrl)
        const explicitPlatform = normalizePlatform(get(row, 'platform'))
        const platform = explicitPlatform || urlPlatform

        if (!username || !platform) {
          result.skipped++
          result.errors.push({
            row: rowNum,
            reason: `Could not extract username/platform from URL: ${profileUrl}`,
          })
          continue
        }

        // Build rates[] array from the single scope/qty/rate cells in this CSV row
        const scope = get(row, 'scopeOfWork') || ''
        const qty = parseFormattedNumber(get(row, 'scopeQty')) || 1
        const rate = parseFormattedNumber(get(row, 'rateIdr')) || 0
        const rates: Rate[] = scope || rate > 0 ? [{ scope, qty, rate }] : []

        const record: any = {
          platform,
          username,
          profileUrl,
          name: get(row, 'name') || null,
          rowNo: parseFormattedNumber(get(row, 'rowNo')),
          categories: get(row, 'categories') || null,
          followers: parseFormattedNumber(get(row, 'followers')),
          tier: get(row, 'tier') || null,
          erPercent: parseFormattedNumber(get(row, 'erPercent')),
          avgViews: parseFormattedNumber(get(row, 'avgViews')),
          gmv: parseFormattedNumber(get(row, 'gmv')),
          remarks: get(row, 'remarks') || null,
          domisili: get(row, 'domisili') || null,
          contact: get(row, 'contact') || null,
          rates,
          primaryRate: pickPrimaryRate(rates),
          status: 'cold',
        }

        batch.push({ ...record, _rowNum: rowNum })

        if (batch.length >= BATCH_SIZE || i === rows.length - 1) {
          // Find existing rows in this batch to apply merge semantics:
          // only update fields that are empty/missing in existing rows.
          const pairs = batch
            .map((r) => `and(platform.eq.${r.platform},username.eq.${r.username})`)
            .join(',')
          const { data: existing } = await supabase
            .from('KOLContacts')
            .select(
              'id, platform, username, name, contact, categories, domisili, remarks, tier, gmv, followers, erPercent, avgViews, rates, importedAt'
            )
            .or(pairs)

          const existingMap = new Map<string, any>()
          for (const e of existing || []) {
            existingMap.set(`${e.platform}:${e.username}`, e)
          }

          const toInsert: any[] = []
          const toUpdate: { id: string; fields: any; rowNum: number }[] = []

          for (const r of batch) {
            const key = `${r.platform}:${r.username}`
            const ex = existingMap.get(key)
            const rowNum = r._rowNum

            if (!ex) {
              const { _rowNum, ...insertRecord } = r
              toInsert.push(insertRecord)
              continue
            }

            // Overwrite mode: replace all fields from CSV (except _rowNum marker)
            if (overwrite) {
              const { _rowNum, ...fields } = r
              toUpdate.push({ id: ex.id, fields, rowNum })
              continue
            }

            // Default merge: only update fields that are empty in existing
            const updates: any = {}
            const tryUpdate = (col: string, csvVal: any) => {
              const isEmpty =
                ex[col] == null || ex[col] === '' || ex[col] === 0
              if (isEmpty && csvVal != null && csvVal !== '') {
                updates[col] = csvVal
              }
            }
            tryUpdate('name', r.name)
            tryUpdate('contact', r.contact)
            tryUpdate('categories', r.categories)
            tryUpdate('domisili', r.domisili)
            tryUpdate('remarks', r.remarks)
            tryUpdate('tier', r.tier)
            tryUpdate('gmv', r.gmv)
            tryUpdate('rowNo', r.rowNo)
            // Engagement: prefer search-time baseline (already set) over CSV
            tryUpdate('followers', r.followers)
            tryUpdate('erPercent', r.erPercent)
            tryUpdate('avgViews', r.avgViews)

            // Rates merge: append new scopes, never overwrite existing scope rates
            const mergedRates = mergeRates(ex.rates, r.rates)
            const existingRateCount = (ex.rates || []).length
            if (mergedRates.length > existingRateCount || !ex.rates) {
              updates.rates = mergedRates
              updates.primaryRate = pickPrimaryRate(mergedRates)
            }

            if (Object.keys(updates).length > 0) {
              toUpdate.push({ id: ex.id, fields: updates, rowNum })
            } else {
              const created = new Date(ex.importedAt).getTime()
              const ageMs = Date.now() - created
              if (ageMs < 5000) {
                result.imported++
              } else {
                result.updated++
              }
            }
          }

          // Batch insert
          if (toInsert.length > 0) {
            const { error: insErr } = await supabase
              .from('KOLContacts')
              .insert(toInsert)
            if (insErr) {
              for (const _ of toInsert) {
                result.errors.push({ row: 0, reason: insErr.message })
              }
              result.skipped += toInsert.length
            } else {
              result.imported += toInsert.length
            }
          }

          // Per-row update (PostgREST doesn't support batch update with different fields)
          for (const u of toUpdate) {
            const { error: updErr } = await supabase
              .from('KOLContacts')
              .update(u.fields)
              .eq('id', u.id)
            if (updErr) {
              result.errors.push({ row: u.rowNum, reason: updErr.message })
              result.skipped++
            } else {
              result.updated++
            }
          }

          batch = []
        }
      } catch (err: any) {
        result.skipped++
        result.errors.push({ row: rowNum, reason: err.message || 'Unknown error' })
      }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'IMPORT_FAILED',
          message: error.message || 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}
