import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - node-fetch types may not match exactly
import fetch from 'node-fetch';

// Add export config to make the route dynamic
export const dynamic = 'force-dynamic';

// Simple proxy that doesn't rely on file system
export async function GET(request: NextRequest) {
  try {
    // Get the model URL from the query parameters
    const { searchParams } = new URL(request.url);
    let modelUrl = searchParams.get('url');

    // Return error if no URL provided
    if (!modelUrl) {
      return NextResponse.json({ error: 'No model URL provided' }, { status: 400 });
    }

    console.log('Proxying model from URL:', modelUrl);
    
    // Fetch the model from the source URL
    const response = await fetch(modelUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://magic.taiyaki.ai',
        'Referer': 'https://magic.taiyaki.ai/',
      },
      timeout: 60000, // 1 minute timeout
    });

    // Check if the request was successful
    if (!response.ok) {
      console.error('Error fetching model:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Failed to fetch model: ${response.status} ${response.statusText}` }, 
        { status: response.status }
      );
    }

    // Get the model data
    const modelData = await response.arrayBuffer();
    const buffer = Buffer.from(modelData);

    // Return the model data directly (no caching)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Disposition': 'attachment; filename="model.glb"',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error in model proxy:', error);
    return NextResponse.json(
      { error: `Server error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 