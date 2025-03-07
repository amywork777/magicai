import { NextResponse } from "next/server"
import OpenAI from "openai"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
})

// Remove the domain detection function as we want consistent behavior everywhere
// function isDeploymentDomain(hostname: string) {
//   return hostname === 'magic.taiyaki.ai' || 
//          hostname.includes('vercel.app') || 
//          hostname.includes('taiyaki.ai');
// }

export async function POST(request: Request) {
  try {
    console.log("🔍 [analyze-image] Received image analysis request");
    
    // Log request URL and hostname for debugging
    const url = new URL(request.url);
    console.log(`🔍 [analyze-image] Request URL: ${url.toString()}`);
    console.log(`🔍 [analyze-image] Hostname: ${url.hostname}`);
    
    // Add CORS headers for all responses to ensure this works when embedded on fishcad.com
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Remove domain check and always attempt to use OpenAI API if key is available
    // const url = new URL(request.url);
    // if (isDeploymentDomain(url.hostname)) {
    //   console.log(`Request from deployment domain: ${url.hostname} - returning fallback response`);
    //   return NextResponse.json(
    //     { 
    //       error: "OpenAI API not configured on this deployment",
    //       description: "Create a 3D model based on the uploaded image. For full AI analysis functionality, please add the OpenAI API key to your environment variables."
    //     },
    //     { 
    //       status: 200,
    //       headers: {
    //         'Access-Control-Allow-Origin': '*',
    //         'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    //         'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    //       }
    //     }
    //   );
    // }
    
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ [analyze-image] OPENAI_API_KEY not found in environment variables");
      return NextResponse.json(
        { 
          error: "OpenAI API key not configured",
          description: "Create a 3D model based on the uploaded image. Please add your OPENAI_API_KEY to the environment variables."
        },
        { 
          status: 200,
          headers: corsHeaders 
        }
      );
    }
    
    console.log("✅ [analyze-image] OPENAI_API_KEY found, proceeding with analysis");
    
    const formData = await request.formData()
    const imageFile = formData.get("image") as File
    const textPrompt = formData.get("prompt") as string
    
    if (!imageFile) {
      console.error("❌ [analyze-image] No image file provided in request");
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log(`🔍 [analyze-image] Analyzing image (size: ${Math.round(imageFile.size / 1024)}KB) with text prompt: ${textPrompt || "[No additional prompt]"}`);
    
    // Convert the file to base64
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString("base64")
    const dataUri = `data:${imageFile.type};base64,${base64Image}`
    
    console.log(`🔍 [analyze-image] Image converted to base64 (length: ${base64Image.length} chars)`);
    
    // Construct prompt for Vision API - optimized for Tripo compatibility
    const userPrompt = textPrompt 
      ? `Look at this image and create a simple, clear description (no more than 3-4 sentences) of what 3D model should be created from it. ${textPrompt}` 
      : "Look at this image and create a simple, clear description (no more than 3-4 sentences) of what 3D model should be created from it. Focus on the main object or character.";
    
    console.log("🔍 [analyze-image] Calling OpenAI Vision API...");
    
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
    
    console.log(`✅ [analyze-image] Generated description (${description.length} chars): "${description}"`);

    const responseJson = { description };
    console.log(`🔍 [analyze-image] Sending response with status 200: ${JSON.stringify(responseJson)}`);
    
    return NextResponse.json(responseJson, { headers: corsHeaders })
  } catch (error) {
    console.error("❌ [analyze-image] Error analyzing image:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze image";
    console.error(`❌ [analyze-image] Error details: ${errorMessage}`);
    
    const fallbackDescription = "Create a 3D model based on the uploaded image.";
    console.log(`🔍 [analyze-image] Using fallback description: "${fallbackDescription}"`);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        description: fallbackDescription // Provide a fallback description even on error
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )
  }
}

// Keep the OPTIONS method handler for CORS preflight requests
export async function OPTIONS(request: Request) {
  console.log("🔍 [analyze-image] Received OPTIONS request for CORS preflight");
  
  return NextResponse.json(
    { success: true },
    { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    }
  );
} 