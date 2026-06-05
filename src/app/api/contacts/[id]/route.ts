import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'

export const runtime = 'nodejs'

const EDITABLE_FIELDS = [
  'name',
  'contact',
  'rateIdr',
  'categories',
  'domisili',
  'tier',
  'scopeOfWork',
  'scopeQty',
  'remarks',
  'status',
] as const

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
        } else if (field === 'rateIdr' || field === 'scopeQty') {
          const num = Number(val)
          if (Number.isFinite(num)) updates[field] = num
        } else {
          updates[field] = String(val)
        }
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
      .select('id, name, contact, rateIdr, categories, domisili, tier, scopeOfWork, scopeQty, remarks, status')
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
