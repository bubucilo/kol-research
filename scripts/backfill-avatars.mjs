// Backfill: re-process existing profile pictures by re-scraping and uploading to Supabase Storage.
// Usage: node scripts/backfill-avatars.mjs
// Requires .env.local to be set up (or env vars passed in).

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Read .env manually since this is a script (not via Next.js)
const envText = readFileSync('.env', 'utf-8')
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"]+)"?/)
  if (m) process.env[m[1]] = m[2]
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APIFY_KEY = process.env.APIFY_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !APIFY_KEY) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

const ACTOR_IDS = {
  tiktok: 'clockworks~tiktok-profile-scraper',
  instagram: 'apify~instagram-profile-scraper',
}

async function getFreshImageUrl(platform, username) {
  const actorId = ACTOR_IDS[platform]
  if (!actorId) return null

  const input = platform === 'instagram'
    ? { usernames: [username], resultsType: 'details' }
    : { profiles: [username], resultsPerPage: 1, shouldDownloadVideos: false, shouldDownloadCovers: false }

  const r = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }
  )
  if (!r.ok) {
    console.log(`  Apify failed: ${r.status}`)
    return null
  }
  const data = await r.json()
  const item = data[0]
  if (!item) return null
  return platform === 'instagram' ? item.profilePicUrl : item.authorMeta?.avatar
}

async function uploadToStorage(remoteUrl, platform, username) {
  const ext = (() => {
    const l = remoteUrl.toLowerCase()
    if (l.includes('.png')) return '.png'
    if (l.includes('.webp')) return '.webp'
    return '.jpg'
  })()
  const safeUser = username.toLowerCase().replace(/[^a-z0-9._-]/g, '_')
  const path = `${platform}/${safeUser}${ext}`

  const r = await fetch(remoteUrl, { headers: BROWSER_HEADERS })
  if (!r.ok) return null
  const ct = r.headers.get('content-type') || 'image/jpeg'
  if (!ct.startsWith('image/')) return null
  const buf = Buffer.from(await r.arrayBuffer())
  if (buf.length === 0) return null

  const { error } = await supabase.storage.from('avatars').upload(path, buf, {
    contentType: ct, upsert: true, cacheControl: '31536000',
  })
  if (error) {
    console.log(`  upload error: ${error.message}`)
    return null
  }
  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  return pub.publicUrl
}

async function processRow(row) {
  console.log(`\n[${row.platform}] @${row.username} (old URL: ${row.profilePicture?.slice(0, 60)}...)`)

  // Skip if already on Supabase Storage
  if (row.profilePicture?.includes('supabase.co/storage')) {
    console.log('  skip: already on Supabase Storage')
    return
  }

  // Step 1: get fresh URL from Apify
  console.log('  → fetching fresh URL from Apify...')
  const freshUrl = await getFreshImageUrl(row.platform, row.username)
  if (!freshUrl) {
    console.log('  FAILED: no fresh URL from Apify')
    return
  }
  console.log(`  → fresh URL: ${freshUrl.slice(0, 60)}...`)

  // Step 2: download and upload to Supabase Storage
  console.log('  → uploading to Supabase Storage...')
  const newUrl = await uploadToStorage(freshUrl, row.platform, row.username)
  if (!newUrl) {
    console.log('  FAILED: could not upload')
    return
  }
  console.log(`  → new URL: ${newUrl}`)

  // Step 3: update DB
  const { error } = await supabase
    .from('ProfileLookup')
    .update({ profilePicture: newUrl })
    .eq('id', row.id)
  if (error) {
    console.log(`  FAILED: db update error: ${error.message}`)
    return
  }
  console.log('  ✅ updated DB')
}

async function main() {
  const { data: rows, error } = await supabase
    .from('ProfileLookup')
    .select('id, platform, username, profilePicture')
    .not('profilePicture', 'is', null)
    .order('lastSearchedAt', { ascending: false })

  if (error) {
    console.error('DB query failed:', error.message)
    process.exit(1)
  }
  console.log(`Found ${rows.length} profiles with profile pictures\n`)

  for (const row of rows) {
    await processRow(row)
  }
  console.log('\nDone.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
