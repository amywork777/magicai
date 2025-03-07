import { NextResponse } from "next/server"
import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
})

export async function POST(request: Request) {
  try {
    // Check if we're on the magic.taiyaki.ai domain and return a friendly message
    const url = new URL(request.url);
    if (url.hostname === 'magic.taiyaki.ai' || url.hostname.includes('vercel.app')) {
      return NextResponse.json(
        { 
          error: "OpenAI API not configured on this deployment",
          description: "This is a generated fallback description for a 3D model. For full functionality, please add the OpenAI API key to your environment variables."
        },
        { status: 200 }
      );
    }
    
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not found in environment variables");
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }
    
    const formData = await request.formData()
    const imageFile = formData.get("image") as File
    const textPrompt = formData.get("prompt") as string
    
    if (!imageFile) {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 }
      )
    }

    console.log("Analyzing image with text prompt:", textPrompt || "[No additional prompt]");
    
    // Convert the file to base64
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString("base64")
    const dataUri = `data:${imageFile.type};base64,${base64Image}`
    
    // Construct prompt for Vision API - optimized for Tripo compatibility
    const userPrompt = textPrompt 
      ? `Look at this image and create a simple, clear description (no more than 3-4 sentences) of what 3D model should be created from it. ${textPrompt}` 
      : "Look at this image and create a simple, clear description (no more than 3-4 sentences) of what 3D model should be created from it. Focus on the main object or character.";
    
    // Call OpenAI Vision API with instructions for a concise description
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a 3D modeling expert who creates brief, clear descriptions for 3D models. Keep descriptions concise (under 400 characters), focusing only on the main object, its shape, and key features. Avoid flowery language, formatting (like markdown), and excessive details. The descriptions will be used directly with a text-to-3D API."
        },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: {
                url: dataUri,
              },
            },
          ],
        },
      ],
      max_tokens: 400,
    })

    // Extract the generated description
    const description = response.choices[0]?.message?.content || ""
    
    console.log("Generated description:", description);

    return NextResponse.json({ description })
  } catch (error) {
    console.error("Error analyzing image:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze image" },
      { status: 500 }
    )
  }
} 