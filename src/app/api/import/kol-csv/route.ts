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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

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
          scopeQty: parseFormattedNumber(get(row, 'scopeQty')),
          scopeOfWork: get(row, 'scopeOfWork') || null,
          rateIdr: parseFormattedNumber(get(row, 'rateIdr')),
          remarks: get(row, 'remarks') || null,
          domisili: get(row, 'domisili') || null,
          contact: get(row, 'contact') || null,
          status: 'cold',
        }

        batch.push(record)

        if (batch.length >= BATCH_SIZE || i === rows.length - 1) {
          const { data: upserted, error } = await supabase
            .from('KOLContacts')
            .upsert(batch, { onConflict: 'platform,username', count: 'exact' })
            .select('id, "importedAt", "updatedAt"')

          if (error) {
            for (const r of batch) {
              result.errors.push({ row: rowNum, reason: error.message, data: r })
            }
            result.skipped += batch.length
          } else {
            for (const u of upserted || []) {
              const created = new Date(u.importedAt).getTime()
              const updated = new Date(u.updatedAt).getTime()
              if (Math.abs(updated - created) < 1000) {
                result.imported++
              } else {
                result.updated++
              }
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
