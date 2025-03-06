import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const taskId = request.nextUrl.searchParams.get("taskId")

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    // Call Tripo API to get task status
    const tripoResponse = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.TRIPO_API_KEY}`,
      },
    })

    if (!tripoResponse.ok) {
      const errorData = await tripoResponse.json()
      console.error("Tripo API error:", errorData)
      return NextResponse.json({ error: "Failed to get task status" }, { status: tripoResponse.status })
    }

    const data = await tripoResponse.json()
    const taskData = data.data

    console.log("Task status:", taskData.status)
    console.log("Task progress:", taskData.progress || 0)

    // Improved logging for debugging
    if (taskData.status === "success") {
      // Use optional chaining to avoid errors if properties are undefined
      console.log("Model URL:", taskData.output?.model || "undefined")
      console.log("Base model URL:", taskData.output?.base_model || "undefined")
    }

    // Handle model URL carefully
    let finalModelUrl = null;
    let baseModelUrl = null;
    
    if (taskData.status === "success" && taskData.output) {
      // Store both URLs 
      finalModelUrl = taskData.output.model || null;
      baseModelUrl = taskData.output.base_model || null;
      
      // Use base_model if available and model isn't, or use whichever is available
      if (!finalModelUrl && baseModelUrl) {
        console.log("Using base_model URL for model display:", baseModelUrl);
        finalModelUrl = baseModelUrl;
      }
      
      if (!finalModelUrl && !baseModelUrl) {
        console.warn("No model URLs found in task output:", taskData.output);
      } else {
        console.log("Using model URL:", finalModelUrl || baseModelUrl);
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

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error getting task status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

