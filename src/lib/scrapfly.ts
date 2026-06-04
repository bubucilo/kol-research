const SCRAPFLY_API_BASE = 'https://api.scrapfly.io/scrape'

export interface ScrapflyOptions {
  url: string
  asp?: boolean
  renderJs?: boolean
  country?: string
  proxyPool?: 'public_datacenter_pool' | 'public_residential_pool'
  renderingWait?: number
  autoScroll?: boolean
  waitSelector?: string
  js?: string
}

export interface ScrapflyResult {
  status: number
  content: string
  format: string
  cost: number
  remainingCredits: number
  browserData?: any
}

async function getApiKey(): Promise<string> {
  const key = process.env.SCRAPFLY_API_KEY
  if (!key) {
    throw new Error('SCRAPFLY_API_KEY environment variable is not set')
  }
  return key
}

export async function scrapeWithScrapfly(
  options: ScrapflyOptions
): Promise<ScrapflyResult> {
  const apiKey = await getApiKey()
  const {
    url,
    asp = true,
    renderJs = true,
    country = 'us',
    proxyPool = 'public_residential_pool',
    renderingWait = 1000,
    autoScroll = false,
    waitSelector,
    js,
  } = options

  const params = new URLSearchParams({
    key: apiKey,
    url,
    asp: String(asp),
    render_js: String(renderJs),
    country,
    proxy_pool: proxyPool,
    rendering_wait: String(renderingWait),
    auto_scroll: String(autoScroll),
  })

  if (waitSelector) {
    params.set('wait_for_selector', waitSelector)
  }

  if (js) {
    params.set('js', Buffer.from(js).toString('base64'))
  }

  const response = await fetch(`${SCRAPFLY_API_BASE}?${params.toString()}`)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Scrapfly scrape failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()

  return {
    status: data.result?.status_code || response.status,
    content: data.result?.content || '',
    format: data.result?.format || 'unknown',
    cost: parseInt(response.headers.get('X-Scrapfly-Api-Cost') || '0'),
    remainingCredits: parseInt(
      response.headers.get('X-Scrapfly-Remaining-Api-Credit') || '0'
    ),
    browserData: data.result?.browser_data || null,
  }
}