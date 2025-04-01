"use client"

import React, { useEffect, useState, useRef } from "react"
import { Canvas, useThree, extend } from "@react-three/fiber"
import { OrbitControls, useGLTF, Html } from "@react-three/drei"
import { Loader2, AlertCircle } from "lucide-react"
import * as THREE from "three"

// Basic interface for our component props
interface ModelViewerProps {
  modelUrl: string | null
  status: "idle" | "uploading" | "generating" | "completed" | "error"
  progress: number
}

// Simple model component that will be used inside the Canvas
function Model({ url }: { url: string }) {
  const modelRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const [loadError, setLoadError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [cachedModelUrl, setCachedModelUrl] = useState<string | null>(null)
  
  // Cache the model on the server and get a local URL
  useEffect(() => {
    async function cacheModel() {
      if (!url) return
      
      try {
        setIsLoading(true)
        setLoadError(false)
        
        console.log(`Requesting model caching for: ${url}`)
        
        // Encode the URL and send it to our proxy endpoint
        const encodedUrl = encodeURIComponent(url)
        const proxyUrl = `/api/proxy-model?url=${encodedUrl}`
        
        const response = await fetch(proxyUrl)
        if (!response.ok) {
          throw new Error(`Failed to cache model: ${response.statusText}`)
        }
        
        const data = await response.json()
        if (!data.success || !data.modelPath) {
          throw new Error('Invalid response from proxy endpoint')
        }
        
        // Set the cached model URL (this will be a local path)
        setCachedModelUrl(data.modelPath)
      } catch (error) {
        console.error('Error caching model:', error)
        setLoadError(true)
      }
    }
    
    cacheModel()
  }, [url])
  
  // Load the model once we have a cached URL
  const { scene } = useGLTF(cachedModelUrl || '', undefined, undefined, (error) => {
    console.error('Error loading GLB:', error)
    setLoadError(true)
    setIsLoading(false)
  })
  
  // Handle model setup once it's loaded
  useEffect(() => {
    if (!scene) return
    
    try {
      // Apply white material
      const whiteMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.1,
      })
      
      scene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.material = whiteMaterial
        }
      })
      
      // Center camera on model
      const box = new THREE.Box3().setFromObject(scene)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      
      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
      const cameraZ = Math.abs(maxDim / Math.sin(fov / 2))
      
      camera.position.set(center.x, center.y, center.z + cameraZ * 1.5)
      camera.lookAt(center)
      camera.updateProjectionMatrix()
      
      // Add the model to our ref
      if (modelRef.current) {
        while (modelRef.current.children.length) {
          modelRef.current.remove(modelRef.current.children[0])
        }
        modelRef.current.add(scene.clone())
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Error setting up model:', error)
      setLoadError(true)
      setIsLoading(false)
    }
  }, [scene, camera])
  
  // Create an empty group for the model
  const group = new THREE.Group()
  
  return (
    <>
      <primitive object={group} ref={modelRef} />
      {isLoading && (
        <Html fullscreen>
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        </Html>
      )}
      {!loadError && !isLoading && (
        <Html position={[0, -1, 0]}>
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 1000
          }}>
            <button
              onClick={() => {
                alert('Model download not implemented yet')
              }}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Download Model
            </button>
          </div>
        </Html>
      )}
    </>
  )
}

// Main ModelViewer component
const ModelViewer = ({ modelUrl, status, progress }: ModelViewerProps) => {
  const [loadError, setLoadError] = useState(false)
  
  // Reset error state when model URL changes
  useEffect(() => {
    if (modelUrl) {
      setLoadError(false)
    }
  }, [modelUrl])
  
  return (
    <div className="w-full h-[450px] bg-gray-100 rounded-lg overflow-hidden border">
      {status === "completed" && modelUrl && !loadError ? (
        <div className="w-full h-full">
          <ErrorBoundary fallback={<div className="w-full h-full flex items-center justify-center text-destructive">Error loading 3D model</div>}>
            <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }}>
              <ambientLight intensity={0.8} />
              <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
              <directionalLight position={[-5, 10, 5]} intensity={0.8} />
              <directionalLight position={[0, -10, 0]} intensity={0.3} />
              <Model url={modelUrl} />
              <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
            </Canvas>
          </ErrorBoundary>
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

// ErrorBoundary component to catch errors in the Three.js rendering
class ErrorBoundary extends React.Component<{
  children: React.ReactNode
  fallback: React.ReactNode
}> {
  state = { hasError: false }
  
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

export default ModelViewer 