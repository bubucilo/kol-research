import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'

export const runtime = 'nodejs'

const EDITABLE_FIELDS = [
  'name',
  'contact',
  'categories',
  'domisili',
  'tier',
  'remarks',
  'status',
] as const

type Rate = { scope: string; qty: number; rate: number }

function pickPrimaryRate(rates: Rate[] | null | undefined): number | null {
  if (!rates || rates.length === 0) return null
  const first = rates.find((r) => r.rate > 0) || rates[0]
  return first.rate || null
}

function validateRates(rates: any): Rate[] | null {
  if (!Array.isArray(rates)) return null
  const cleaned: Rate[] = []
  for (const r of rates) {
    if (!r || typeof r !== 'object') continue
    const scope = typeof r.scope === 'string' ? r.scope.trim() : ''
    const qty = Number(r.qty)
    const rate = Number(r.rate)
    if (!scope && !(rate > 0)) continue // skip empty rows
    cleaned.push({
      scope,
      qty: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1,
      rate: Number.isFinite(rate) && rate > 0 ? Math.floor(rate) : 0,
    })
  }
  return cleaned
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updates: any = {}
    for (const field of EDITABLE_FIELDS) {
      if (field in body) {
        const val = body[field]
        if (val === '' || val === null) {
          updates[field] = null
        } else {
          updates[field] = String(val)
        }
      }
    }

    // Special handling for rates[] array
    if ('rates' in body) {
      const cleaned = validateRates(body.rates)
      if (cleaned !== null) {
        updates.rates = cleaned
        updates.primaryRate = pickPrimaryRate(cleaned)
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_CHANGES', message: 'No editable fields provided' } },
        { status: 400 }
      )
    }

    const { data, error } = await getClient()
      .from('KOLContacts')
      .update(updates)
      .eq('id', id)
      .select('id, name, contact, rates, primaryRate, categories, domisili, tier, remarks, status')
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Contact not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Contact update error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error.message || 'Failed to update contact',
        },
      },
      { status: 500 }
    )
  }
}
