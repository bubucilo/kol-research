import { createClient, SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'avatars'

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    client = createClient(url, key, { auth: { persistSession: false } })
  }
  return client
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

/**
 * Downloads an external image (e.g. from Instagram/TikTok CDN) and uploads
 * it to Supabase Storage so the URL is permanent and CORS-friendly.
 *
 * Returns the public Supabase URL on success, or null on failure (so caller
 * can fall back to the original CDN URL or a placeholder).
 */
export async function uploadAvatar(
  remoteUrl: string,
  platform: string,
  username: string
): Promise<string | null> {
  if (!remoteUrl) return null

  const ext = guessExtension(remoteUrl)
  const safeUser = username.toLowerCase().replace(/[^a-z0-9._-]/g, '_')
  const path = `${platform}/${safeUser}${ext}`

  try {
    const resp = await fetch(remoteUrl, { headers: BROWSER_HEADERS })
    if (!resp.ok) {
      console.warn(`[storage] Failed to fetch ${remoteUrl}: ${resp.status}`)
      return null
    }

    const contentType = resp.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      console.warn(`[storage] Non-image content-type for ${username}: ${contentType}`)
      return null
    }

    const buffer = Buffer.from(await resp.arrayBuffer())
    if (buffer.length === 0) {
      console.warn(`[storage] Empty image bytes for ${username}`)
      return null
    }

    const { error: uploadErr } = await getClient()
      .storage.from(BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: true,
        cacheControl: '31536000',
      })

    if (uploadErr) {
      console.warn(`[storage] Upload failed for ${username}: ${uploadErr.message}`)
      return null
    }

    const { data: pub } = getClient().storage.from(BUCKET).getPublicUrl(path)
    return pub.publicUrl
  } catch (err: any) {
    console.warn(`[storage] uploadAvatar error for ${username}: ${err.message}`)
    return null
  }
}

function guessExtension(url: string): string {
  const lower = url.toLowerCase()
  if (lower.includes('.png')) return '.png'
  if (lower.includes('.webp')) return '.webp'
  if (lower.includes('.gif')) return '.gif'
  if (lower.includes('.heic') || lower.includes('.heif')) return '.heic'
  return '.jpg'
}
