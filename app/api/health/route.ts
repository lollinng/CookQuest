import { NextResponse } from 'next/server'

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api/v1'
  // Strip /api/v1 to get base URL for backend health check
  const backendBase = apiUrl.replace(/\/api\/v1\/?$/, '')

  let backendStatus = 'unknown'
  try {
    const res = await fetch(`${backendBase}/ready`, {
      signal: AbortSignal.timeout(3000),
    })
    backendStatus = res.ok ? 'ok' : 'degraded'
  } catch {
    backendStatus = 'unreachable'
  }

  const healthy = backendStatus === 'ok'

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        frontend: 'ok',
        backend: backendStatus,
      },
    },
    { status: healthy ? 200 : 503 }
  )
}
