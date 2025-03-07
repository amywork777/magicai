import { type NextRequest, NextResponse } from "next/server"

// Define CORS headers for consistent use
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
  'Access-Control-Max-Age': '86400',
};

// Common handler for any method that needs to get task status
async function handleTaskStatus(request: NextRequest) {
  try {
    // Extract task ID from query parameters
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get("taskId")

    console.log(`🔍 [task-status] Checking status for task ID: ${taskId}`);
    
    if (!taskId) {
      console.error(`❌ [task-status] No task ID provided in request`);
      return NextResponse.json(
        { error: "Task ID is required" }, 
        { status: 400, headers: corsHeaders }
      );
    }

    // Call Tripo API to check task status
    const tripoResponse = await fetch(`https://api.tripo3d.ai/v2/openapi/task?task_id=${taskId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.TRIPO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    console.log(`🔍 [task-status] Tripo API status response: ${tripoResponse.status} ${tripoResponse.statusText}`);
    
    if (!tripoResponse.ok) {
      const errorData = await tripoResponse.json().catch(e => ({ error: 'Failed to parse error response' }));
      console.error(`❌ [task-status] Tripo API error:`, errorData);
      return NextResponse.json(
        { error: "Failed to get task status", details: errorData }, 
        { status: 200, headers: corsHeaders } // Return 200 to avoid CORS issues, client will handle error
      );
    }

    const data = await tripoResponse.json().catch(e => {
      console.error(`❌ [task-status] Failed to parse Tripo API response:`, e);
      return { data: { status: 'error', progress: 0 } };
    });
    
    const taskData = data.data
    
    console.log(`🔍 [task-status] Task status: ${taskData.status}, progress: ${taskData.progress || 0}%`);
    
    // Extract model URLs for completed tasks
    let finalModelUrl = null;
    let baseModelUrl = null;
    
    if (taskData.status === "success" && taskData.output) {
      // Store both URLs 
      finalModelUrl = taskData.output.model || null;
      baseModelUrl = taskData.output.base_model || null;
      
      console.log(`🔍 [task-status] Final model URL: ${finalModelUrl || 'not available'}`);
      console.log(`🔍 [task-status] Base model URL: ${baseModelUrl || 'not available'}`);
      
      // Use base_model if available and model isn't, or use whichever is available
      if (!finalModelUrl && baseModelUrl) {
        console.log(`✅ [task-status] Using base_model URL for model display: ${baseModelUrl}`);
        finalModelUrl = baseModelUrl;
      }
      
      if (!finalModelUrl && !baseModelUrl) {
        console.warn(`⚠️ [task-status] No model URLs found in task output:`, taskData.output);
      } else {
        console.log(`✅ [task-status] Using model URL: ${finalModelUrl || baseModelUrl}`);
      }
    }

    // Format the response with all URLs
    const response = {
      status: taskData.status,
      progress: taskData.progress || 0,
      modelUrl: finalModelUrl,
      baseModelUrl: baseModelUrl, // Also return baseModelUrl separately
      renderedImage: taskData.status === "success" ? taskData.output?.rendered_image : null,
    }
    
    console.log(`🔍 [task-status] Sending response:`, response);

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    console.error(`❌ [task-status] Error getting task status:`, error)
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error",
        status: 'running', // Provide fallback status to avoid UI breaking
        progress: 10  // Provide some progress to show in UI
      }, 
      { status: 200, headers: corsHeaders } // Return 200 even on error for CORS compatibility
    );
  }
}

// GET method handler
export async function GET(request: NextRequest) {
  console.log("🔍 [task-status] GET request received");
  return handleTaskStatus(request);
}

// POST method handler (same functionality, different HTTP method for compatibility)
export async function POST(request: NextRequest) {
  console.log("🔍 [task-status] POST request received");
  return handleTaskStatus(request);
}

// HEAD method handler (for preflight/CORS)
export async function HEAD(request: NextRequest) {
  console.log("🔍 [task-status] HEAD request received");
  return new NextResponse(null, { 
    status: 200, 
    headers: corsHeaders
  });
}

// OPTIONS method handler for CORS preflight requests
export async function OPTIONS(request: Request) {
  console.log("🔍 [task-status] OPTIONS request received");
  return NextResponse.json(
    { success: true },
    { 
      status: 200,
      headers: corsHeaders
    }
  );
}

