"use client"

import React, { useEffect, useState, useRef } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Define the properties for ModelViewer component
interface ModelViewerProps {
  modelUrl?: string;
  status?: 'idle' | 'uploading' | 'generating' | 'completed' | 'error';
  progress?: number;
  onError?: (error: any) => void;
}

// Main ModelViewer component
export default function ModelViewer({ 
  modelUrl, 
  status = 'idle',
  progress = 0,
  onError
}: ModelViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loadError, setLoadError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  // Function to handle error events
  const handleError = (error: any) => {
    console.error('Error in ModelViewer:', error, 'Model URL:', modelUrl);
    setLoadError(true);
    if (onError) {
      onError(error);
    }
    
    // Try fallback after error
    if (!useFallback && modelUrl) {
      console.log('Switching to fallback viewer');
      setUseFallback(true);
    }
  };

  // Reset error state when model URL changes
  useEffect(() => {
    if (modelUrl) {
      setLoadError(false);
    }
  }, [modelUrl]);

  // Generate HTML content for model viewer
  const generateModelViewerHtml = () => {
    if (!modelUrl) return '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin-allow-popups">
          <meta http-equiv="Cross-Origin-Embedder-Policy" content="credentialless">
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
          </style>
          <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js" crossorigin="anonymous"></script>
        </head>
        <body>
          <model-viewer
            src="${modelUrl}"
            camera-controls
            auto-rotate
            shadow-intensity="1" 
            shadow-softness="0.5"
            exposure="0.8"
            ar
            ar-modes="webxr scene-viewer"
            orientation="0 0 0"
            environment-image="neutral"
            crossorigin="anonymous"
            loading="eager"
            reveal="auto"
            onerror="parent.postMessage({type: 'error', message: 'Failed to load model'}, '*')"
          >
            <div class="error" id="error" style="display: none;">
              Error loading 3D model. Please try again with a different prompt or image.
            </div>
          </model-viewer>
          <script>
            // Preload the model
            const preloadLink = document.createElement('link');
            preloadLink.rel = 'preload';
            preloadLink.href = '${modelUrl}';
            preloadLink.as = 'fetch';
            preloadLink.crossOrigin = 'anonymous';
            document.head.appendChild(preloadLink);
            
            // Listen for errors from model-viewer
            document.querySelector('model-viewer').addEventListener('error', function(event) {
              document.getElementById('error').style.display = 'flex';
              parent.postMessage({type: 'error', message: 'Failed to load model'}, '*');
            });
          </script>
        </body>
      </html>
    `;
  };

  // Handle message events from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'error') {
        handleError(event.data.message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Prepare the iframe URL for fallback mode
  const fallbackUrl = modelUrl ? `/model-viewer.html?url=${encodeURIComponent(modelUrl)}` : '';

  // Determine what to render based on status
  const renderContent = () => {
    if (status === 'idle') {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground p-6 text-center">
          Waiting for model generation to begin...
        </div>
      );
    }

    if (status === 'uploading') {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <div className="text-muted-foreground">
            Uploading... {progress > 0 ? `${Math.round(progress)}%` : ''}
          </div>
        </div>
      );
    }

    if (status === 'generating') {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <div className="text-muted-foreground">
            Generating 3D model... {progress > 0 ? `${Math.round(progress)}%` : ''}
          </div>
        </div>
      );
    }

    if (status === 'error' || loadError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-destructive p-6 text-center gap-4">
          <AlertCircle className="h-8 w-8" />
          <div>Error loading 3D model. Please try again.</div>
          {modelUrl && (
            <Button 
              variant="outline" 
              onClick={() => {
                setLoadError(false);
                setUseFallback(!useFallback);
              }}
            >
              Try Alternative Viewer
            </Button>
          )}
        </div>
      );
    }

    if (status === 'completed' && modelUrl) {
      if (useFallback) {
        return (
          <iframe
            ref={iframeRef}
            src={fallbackUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            allow="autoplay; camera; microphone; xr-spatial-tracking"
            loading="eager"
            onError={handleError}
          />
        );
      }
      
      return (
        <iframe
          ref={iframeRef}
          srcDoc={generateModelViewerHtml()}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          allow="autoplay; camera; microphone; xr-spatial-tracking"
          loading="eager"
          onError={handleError}
        />
      );
    }

    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-6 text-center">
        Waiting for model...
      </div>
    );
  };

  return (
    <Card className="w-full h-[500px] overflow-hidden">
      {renderContent()}
    </Card>
  );
} 