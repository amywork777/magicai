import { type NextRequest, NextResponse } from "next/server"

// Define CORS headers for consistent use
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(request: NextRequest) {
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
      },
    })

    console.log(`🔍 [task-status] Tripo API status response: ${tripoResponse.status} ${tripoResponse.statusText}`);
    
    if (!tripoResponse.ok) {
      const errorData = await tripoResponse.json()
      console.error(`❌ [task-status] Tripo API error:`, errorData);
      return NextResponse.json(
        { error: "Failed to get task status" }, 
        { status: tripoResponse.status, headers: corsHeaders }
      );
    }

    const data = await tripoResponse.json()
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
      { error: "Internal server error" }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

// Add OPTIONS method handler for CORS preflight requests
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

