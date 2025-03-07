import { type NextRequest, NextResponse } from "next/server"

// Function to clean up and shorten the OpenAI-generated description
const cleanDescription = (description: string): string => {
  // Remove markdown formatting
  let cleanedText = description
    .replace(/#+\s/g, '') // Remove heading markers
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/\n+/g, ' ') // Replace multiple newlines with a single space
    .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
    .trim();
  
  // Limit to 500 characters to ensure it works with Tripo API
  if (cleanedText.length > 500) {
    cleanedText = cleanedText.substring(0, 497) + '...';
  }
  
  return cleanedText;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, prompt, imageToken } = body

    // If prompt is very long (likely from OpenAI Vision API), clean it up
    const processedPrompt = prompt && prompt.length > 200 
      ? cleanDescription(prompt)
      : prompt;
    
    console.log("Original prompt length:", prompt?.length || 0);
    console.log("Processed prompt length:", processedPrompt?.length || 0);
    
    let requestBody

    if (type === "text") {
      // Text to model - without textures
      requestBody = {
        type: "text_to_model",
        prompt: processedPrompt,
        model_version: "v2.5-20250123",
        texture: false, // Disable textures
        pbr: false, // Disable PBR
        auto_size: true, // Enable auto-sizing for better proportions
      }
    } else if (type === "image") {
      // Image to model - without textures
      requestBody = {
        type: "image_to_model",
        model_version: "v2.5-20250123",
        file: {
          type: "jpg",
          file_token: imageToken,
        },
        texture: false, // Disable textures
        pbr: false, // Disable PBR
        auto_size: true, // Enable auto-sizing for better proportions
      }
    } else {
      return NextResponse.json({ error: "Invalid generation type" }, { status: 400 })
    }

    console.log("Sending request to Tripo API:", requestBody)

    // Call Tripo API to start model generation
    const tripoResponse = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TRIPO_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!tripoResponse.ok) {
      const errorData = await tripoResponse.json()
      console.error("Tripo API error:", errorData)
      return NextResponse.json({ error: "Failed to start model generation" }, { status: tripoResponse.status })
    }

    const data = await tripoResponse.json()
    console.log("Tripo API response:", data)

    return NextResponse.json({
      taskId: data.data.task_id,
    })
  } catch (error) {
    console.error("Error generating model:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

