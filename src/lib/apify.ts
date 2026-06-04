const APIFY_API_BASE = 'https://api.apify.com/v2'

export interface ApifyRunResult<T = any> {
  runId: string
  datasetId: string
  status: string
  items: T[]
}

async function getApiKey(): Promise<string> {
  const key = process.env.APIFY_API_KEY
  if (!key) {
    throw new Error('APIFY_API_KEY environment variable is not set')
  }
  return key
}

export async function runApifyActor<T = any>(
  actorId: string,
  input: Record<string, any>,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<ApifyRunResult<T>> {
  const apiKey = await getApiKey()
  const { timeoutMs = 90_000, pollIntervalMs = 3_000 } = options

  const startResp = await fetch(
    `${APIFY_API_BASE}/acts/${encodeURIComponent(actorId)}/runs?token=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  )

  if (!startResp.ok) {
    const errText = await startResp.text()
    throw new Error(`Apify run start failed: ${startResp.status} ${errText}`)
  }

  const startData = await startResp.json()
  const runId: string = startData.data?.id
  const datasetId: string = startData.data?.defaultDatasetId
  if (!runId || !datasetId) {
    throw new Error(`Apify run start missing runId/datasetId: ${JSON.stringify(startData)}`)
  }

  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs))

    const statusResp = await fetch(
      `${APIFY_API_BASE}/actor-runs/${runId}?token=${apiKey}`
    )
    if (!statusResp.ok) continue

    const statusData = await statusResp.json()
    const status: string = statusData.data?.status

    if (status === 'SUCCEEDED') {
      const itemsResp = await fetch(
        `${APIFY_API_BASE}/datasets/${datasetId}/items?token=${apiKey}`
      )
      if (!itemsResp.ok) {
        throw new Error(`Apify dataset fetch failed: ${itemsResp.status}`)
      }
      const items = await itemsResp.json()
      return { runId, datasetId, status, items: items as T[] }
    }

    if (status === 'FAILED' || status === 'TIMED-OUT' || status === 'ABORTED') {
      throw new Error(`Apify run ${status.toLowerCase()}: ${runId}`)
    }
  }

  throw new Error(`Apify run timed out after ${timeoutMs}ms: ${runId}`)
}
