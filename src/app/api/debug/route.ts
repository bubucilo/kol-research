import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const results: Record<string, any> = {}
  
  // Test 1: External HTTP
  try {
    const r = await fetch('https://httpbin.org/ip', { 
      signal: AbortSignal.timeout(5000) 
    })
    results.http = await r.text()
  } catch (e: any) {
    results.http = `FAIL: ${e.message}`
  }
  
  // Test 2: Supabase REST API
  try {
    const r = await fetch('https://xfytefubrmzramppppmd.supabase.co/rest/v1/', { 
      signal: AbortSignal.timeout(5000) 
    })
    results.supabaseApi = `HTTP ${r.status}: ${(await r.text()).slice(0,200)}`
  } catch (e: any) {
    results.supabaseApi = `FAIL: ${e.message}`
  }
  
  // Test 3: DNS lookup
  try {
    const dns = await import('dns').then(m => m.promises)
    const addrs = await dns.resolve4('db.xfytefubrmzramppppmd.supabase.co')
    results.dnsV4 = addrs
  } catch (e: any) {
    results.dnsV4 = `FAIL: ${e.message}`
  }
  
  try {
    const dns = await import('dns').then(m => m.promises)
    const addrs = await dns.resolve6('db.xfytefubrmzramppppmd.supabase.co')
    results.dnsV6 = addrs
  } catch (e: any) {
    results.dnsV6 = `FAIL: ${e.message}`
  }
  
  // Test 4: TCP connection to 5432 and 6543
  for (const port of [5432, 6543]) {
    try {
      const net = await import('net')
      const result = await new Promise<string>((resolve) => {
        const socket = new net.Socket()
        const timeout = setTimeout(() => { socket.destroy(); resolve(`TIMEOUT`); }, 5000)
        socket.connect(port, 'db.xfytefubrmzramppppmd.supabase.co', () => {
          clearTimeout(timeout)
          socket.destroy()
          resolve('OK')
        })
        socket.on('error', (e) => {
          clearTimeout(timeout)
          resolve(`ERR: ${e.message}`)
        })
      })
      results[`tcp_${port}`] = result
    } catch (e: any) {
      results[`tcp_${port}`] = `FAIL: ${e.message}`
    }
  }

  // Test 5: Pooler hosts (have IPv4)
  for (const host of ['aws-0-us-east-1.pooler.supabase.com', 'aws-0-us-west-1.pooler.supabase.com', 'aws-0-us-east-2.pooler.supabase.com', 'aws-0-ap-southeast-1.pooler.supabase.com', 'aws-0-ap-southeast-2.pooler.supabase.com', 'aws-0-ap-northeast-1.pooler.supabase.com', 'aws-0-eu-west-1.pooler.supabase.com', 'aws-0-eu-west-2.pooler.supabase.com', 'aws-0-eu-central-1.pooler.supabase.com', 'aws-0-sa-east-1.pooler.supabase.com', 'aws-0-ca-central-1.pooler.supabase.com']) {
    try {
      const dns = await import('dns').then(m => m.promises)
      const v4 = await dns.resolve4(host).catch((e: any) => `ERR: ${e.message}`)
      results[`pooler_${host}_v4`] = v4
    } catch (e: any) {
      results[`pooler_${host}_v4`] = `FAIL: ${e.message}`
    }
  }
  
  return NextResponse.json(results)
}
