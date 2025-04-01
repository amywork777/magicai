"use client"

import React, { useEffect, useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"

// Basic interface for our component props
interface ModelViewerProps {
  modelUrl: string | null
  status: "idle" | "uploading" | "generating" | "completed" | "error"
  progress: number
}

// Main ModelViewer component - simplified to use an iframe with model-viewer
const ModelViewer = ({ modelUrl, status, progress }: ModelViewerProps) => {
  const [loadError, setLoadError] = useState(false)
  const [iframeKey, setIframeKey] = useState(Date.now())

  // Reset error state when model URL changes
  useEffect(() => {
    if (modelUrl) {
      setLoadError(false)
      // Create a new iframe key to force reload when URL changes
      setIframeKey(Date.now())
    }
  }, [modelUrl])

  // Create a viewer HTML document that will be served in an iframe
  // This isolates the CORS issues and uses Google's model-viewer web component
  const createViewerHtml = (url: string) => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>3D Model Viewer</title>
        <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"></script>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          model-viewer {
            width: 100%;
            height: 100%;
            background-color: #f5f5f5;
          }
          .error {
            display: flex;
            justify-content: center;
            align-items: center;
            color: #e11d48;
            height: 100%;
            text-align: center;
            padding: 1rem;
          }
          .loading {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: rgba(0, 0, 0, 0.5);
            color: white;
          }
          .download-btn {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background-color: #06b6d4; /* primary color */
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-family: sans-serif;
            font-weight: 500;
            font-size: 14px;
          }
          .download-btn:hover {
            background-color: #0891b2;
          }
        </style>
      </head>
      <body>
        <model-viewer 
          src="${url}" 
          camera-controls
          auto-rotate
          shadow-intensity="1" 
          shadow-softness="0.5"
          exposure="0.8"
          ar
          ar-modes="webxr scene-viewer"
          orientation="0 0 0"
          environment-image="neutral"
          onload="document.getElementById('loading').style.display = 'none';"
          onerror="handleError()"
        >
          <div id="loading" class="loading">
            <div style="text-align: center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="spin">
                <path opacity="0.2" fill-rule="evenodd" clip-rule="evenodd" d="M12 19C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5C8.13401 5 5 8.13401 5 12C5 15.866 8.13401 19 12 19ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="white"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 5C8.13401 5 5 8.13401 5 12H2C2 6.47715 6.47715 2 12 2V5Z" fill="white"/>
              </svg>
              <div style="margin-top: 12px;">Loading 3D Model...</div>
            </div>
          </div>
          <div id="error" class="error" style="display: none;">
            Error loading 3D model. Please try again with a different prompt or image.
          </div>
          <button slot="ar-button" class="download-btn">
            View in AR
          </button>
        </model-viewer>
        <script>
          function handleError() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'flex';
          }

          // Add animation for the loading spinner
          document.querySelector('.spin').animate(
            [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
            { duration: 1000, iterations: Infinity }
          );
        </script>
      </body>
      </html>
    `;
  };

  return (
    <div className="w-full h-[450px] bg-gray-100 rounded-lg overflow-hidden border">
      {status === "completed" && modelUrl && !loadError ? (
        <div className="w-full h-full">
          <iframe 
            key={iframeKey}
            title="3D Model Viewer"
            className="w-full h-full border-0"
            srcDoc={createViewerHtml(modelUrl)}
            sandbox="allow-scripts allow-same-origin"
            onError={() => setLoadError(true)}
          />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
          {status === "idle" ? (
            <div className="text-center p-6 max-w-md">
              <img
                src="/placeholder.svg?height=120&width=120"
                alt="3D model placeholder"
                className="mx-auto mb-4 opacity-20"
              />
              <p className="text-muted-foreground text-lg">Your 3D model will appear here</p>
              <p className="text-muted-foreground text-sm mt-2">
                Enter a description or upload an image to generate a 3D model
              </p>
            </div>
          ) : status === "error" || loadError ? (
            <div className="text-center text-destructive p-6">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p className="font-medium">Error generating model</p>
              <p className="text-sm mt-2">Please try again with a different prompt or image</p>
            </div>
          ) : (
            <div className="text-center p-6">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-primary font-medium">
                {status === "uploading" ? "Uploading image..." : `Generating 3D model`}
              </p>
              {status === "generating" && (
                <div className="mt-4 w-64 mx-auto">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{progress}% complete</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ModelViewer 