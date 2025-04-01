import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { mkdir } from 'fs/promises'

// Create a map to track models currently being downloaded
const activeDownloads = new Map<string, Promise<string>>()

async function downloadAndCacheModel(modelUrl: string): Promise<string> {
  try {
    // Create a hash of the URL to use as the filename
    const modelId = modelUrl.split('/').pop()?.split('?')[0] || `model-${Date.now()}.glb`
    
    // Make sure the cache directory exists
    const cacheDir = path.join(process.cwd(), 'public', 'model-cache')
    await mkdir(cacheDir, { recursive: true })
    
    const localFilePath = path.join(cacheDir, modelId)
    
    // Check if we already have this model cached
    if (fs.existsSync(localFilePath)) {
      console.log(`Model already cached at ${localFilePath}`)
      return `/model-cache/${modelId}`
    }
    
    console.log(`Downloading model from: ${modelUrl}`)
    
    // Fetch the model with appropriate headers
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
      throw new Error(`Failed to download model: ${response.status} ${response.statusText}`)
    }
    
    // Get the model data as a buffer
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Save the model to the public directory
    fs.writeFileSync(localFilePath, buffer)
    
    console.log(`Model cached successfully at ${localFilePath}`)
    
    // Return the public URL path to the cached model
    return `/model-cache/${modelId}`
  } catch (error) {
    console.error('Error downloading and caching model:', error)
    throw error
  }
}

export async function GET(request: Request) {
  try {
    // Get the URL from the query parameter
    const { searchParams } = new URL(request.url)
    const modelUrl = searchParams.get('url')
    
    if (!modelUrl) {
      return new NextResponse('Model URL is required as a query parameter', { status: 400 })
    }
    
    // Check if we're already downloading this model
    if (!activeDownloads.has(modelUrl)) {
      // Start a new download and cache operation
      activeDownloads.set(modelUrl, downloadAndCacheModel(modelUrl))
    }
    
    // Wait for the download to complete
    const localPath = await activeDownloads.get(modelUrl)
    
    // Clean up the download tracking after a delay
    setTimeout(() => {
      activeDownloads.delete(modelUrl)
    }, 60000) // Remove after 1 minute
    
    // Return a redirect to the local file
    return NextResponse.json({ 
      success: true, 
      modelPath: localPath 
    })
  } catch (error) {
    console.error('Error in GET handler:', error)
    return new NextResponse(`Failed to proxy model: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 })
  }
}

// Support POST for backward compatibility
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
    return new NextResponse(`Failed to proxy model: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 })
  }
} 