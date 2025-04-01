import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { modelUrl } = await request.json()

    if (!modelUrl) {
      return new NextResponse('Model URL is required', { status: 400 })
    }

    // Fetch the model from the original URL
    const response = await fetch(modelUrl, {
      headers: {
        'Accept': 'model/gltf-binary',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${response.statusText}`)
    }

    // Get the model data as a blob
    const blob = await response.blob()

    // Return the model with appropriate headers
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Error proxying model:', error)
    return new NextResponse('Failed to proxy model', { status: 500 })
  }
} 