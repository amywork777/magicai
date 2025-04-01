import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Get the URL from the query parameter
    const { searchParams } = new URL(request.url)
    const modelUrl = searchParams.get('url')

    if (!modelUrl) {
      return new NextResponse('Model URL is required as a query parameter', { status: 400 })
    }

    console.log(`Attempting to proxy model from: ${modelUrl}`)

    // Fetch the model from the original URL
    const response = await fetch(modelUrl, {
      headers: {
        'Accept': 'model/gltf-binary, */*',
        'Origin': 'https://magic.taiyaki.ai',
        'Referer': 'https://magic.taiyaki.ai/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error(`Failed to proxy model: ${response.status} ${response.statusText}`)
      return new NextResponse(`Failed to fetch model: ${response.status} ${response.statusText}`, { 
        status: response.status 
      })
    }

    // Get the model data as a blob
    const blob = await response.blob()
    console.log(`Successfully proxied model: ${blob.size} bytes`)

    // Return the model with appropriate headers
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error proxying model:', error)
    return new NextResponse(`Failed to proxy model: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
      status: 500 
    })
  }
}

// Also support POST for backward compatibility
export async function POST(request: Request) {
  try {
    const { modelUrl } = await request.json()

    if (!modelUrl) {
      return new NextResponse('Model URL is required', { status: 400 })
    }

    // Redirect to the GET endpoint
    return GET(new Request(`${new URL(request.url).origin}/api/proxy-model?url=${encodeURIComponent(modelUrl)}`))
  } catch (error) {
    console.error('Error in POST handler:', error)
    return new NextResponse(`Failed to proxy model: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
      status: 500 
    })
  }
} 