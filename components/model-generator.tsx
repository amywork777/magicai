"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Download, Upload, Wand2, RefreshCw, Mic, MicOff } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useDropzone } from "react-dropzone"
import { convertGlbToStl } from "@/lib/stl-utils"
import * as THREE from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

// Add type definitions for Speech Recognition API
interface SpeechRecognitionEvent extends Event {
  results: {
    item(index: number): {
      item(index: number): {
        transcript: string;
      };
    };
    length: number;
  };
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

// Add global declarations
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

type ModelGenerationStatus = "idle" | "uploading" | "generating" | "completed" | "error"
type InputType = "text" | "image"

export function ModelGenerator() {
  const [inputType, setInputType] = useState<InputType>("text")
  const [textPrompt, setTextPrompt] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [status, setStatus] = useState<ModelGenerationStatus>("idle")
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [stlBlob, setStlBlob] = useState<Blob | null>(null)
  const [isConvertingStl, setIsConvertingStl] = useState(false)
  const [stlUrl, setStlUrl] = useState<string | null>(null)
  const [stlViewerRef, setStlViewerRef] = useState<HTMLDivElement | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const { toast } = useToast()

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionConstructor) {
        recognitionRef.current = new SpeechRecognitionConstructor();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(Array(event.results.length))
            .map((_, i) => event.results.item(i).item(0).transcript)
            .join('');
          
          setTextPrompt(transcript);
        };
        
        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error', event.error);
          setIsRecording(false);
          toast({
            title: "Voice Input Error",
            description: "Failed to recognize speech. Please try again.",
            variant: "destructive",
          });
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not Supported",
        description: "Voice input is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast({
        title: "Voice Recording Stopped",
        description: "Voice input has been added to the text field.",
      });
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
      toast({
        title: "Voice Recording Started",
        description: "Speak now to add your description...",
      });
    }
  };

  const resetState = () => {
    setTextPrompt("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setStatus("idle");
    setModelUrl(null);
    setTaskId(null);
    setProgress(0);
    setIsGenerating(false);
    setIsDownloading(false);
    setStlBlob(null);
    setStlUrl(null);
    // If recording is active, stop it
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    
    toast({
      title: "Reset Complete",
      description: "Ready to generate a new 3D model!",
    });
  };

  const addToFishCAD = async () => {
    if (!stlBlob) {
      toast({
        title: "No STL Available",
        description: "Please generate and convert a model to STL first.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Adding to FishCAD",
      description: "Uploading your model to FishCAD...",
    });
    
    try {
      // This would be where you'd implement the actual API call to FishCAD
      // For now, we'll just simulate it with a timeout
      
      setTimeout(() => {
        toast({
          title: "Success!",
          description: "Your model has been added to FishCAD. Visit fishcad.com to view it.",
        });
      }, 2000);
      
      // In a real implementation you would do something like:
      // const formData = new FormData();
      // formData.append('file', stlBlob, 'model.stl');
      // const response = await fetch('https://fishcad.com/api/upload', {
      //   method: 'POST',
      //   body: formData,
      // });
      // Process the response here...
      
    } catch (error) {
      console.error('Error uploading to FishCAD:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload to FishCAD. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
    },
    maxFiles: 1,
    disabled: status === "uploading" || status === "generating",
  })

  const handleTextSubmit = async () => {
    if (!textPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description for your 3D model",
        variant: "destructive",
      })
      return
    }

    try {
      setStatus("generating")
      setProgress(0)
      setIsGenerating(true)
      // Reset STL state when generating a new model
      setStlBlob(null)
      setStlUrl(null)

      // Call the API to start text-to-model generation
      const response = await fetch("/api/generate-model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "text",
          prompt: textPrompt,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start model generation")
      }

      const data = await response.json()
      setTaskId(data.taskId)

      // Start polling for task status
      pollTaskStatus(data.taskId)
    } catch (error) {
      console.error("Error generating model:", error)
      setStatus("error")
      setIsGenerating(false)
      toast({
        title: "Error",
        description: "Failed to generate model. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleImageSubmit = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select an image to upload",
        variant: "destructive",
      })
      return
    }

    try {
      setStatus("uploading")
      setProgress(0)
      setIsGenerating(true)
      // Reset STL state when generating a new model
      setStlBlob(null)
      setStlUrl(null)

      // First upload the image
      const formData = new FormData()
      formData.append("file", selectedFile)

      const uploadResponse = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image")
      }

      const uploadData = await uploadResponse.json()

      // Then start the image-to-model generation
      setStatus("generating")
      const response = await fetch("/api/generate-model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "image",
          imageToken: uploadData.imageToken,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start model generation")
      }

      const data = await response.json()
      setTaskId(data.taskId)

      // Start polling for task status
      pollTaskStatus(data.taskId)
    } catch (error) {
      console.error("Error generating model:", error)
      setStatus("error")
      setIsGenerating(false)
      toast({
        title: "Error",
        description: "Failed to generate model. Please try again.",
        variant: "destructive",
      })
    }
  }

  const convertToStl = async (url: string) => {
    try {
      setIsConvertingStl(true)
      
      // Convert GLB to STL
      const blob = await convertGlbToStl(url)
      setStlBlob(blob)
      
      // Create a URL for the STL blob
      const blobUrl = URL.createObjectURL(blob)
      setStlUrl(blobUrl)
      
      toast({
        title: "Conversion complete",
        description: "Your model has been converted to STL format.",
      })
      
      return blob
    } catch (error) {
      console.error("Error converting to STL:", error)
      toast({
        title: "Error",
        description: "Failed to convert model to STL format. You can still try downloading.",
        variant: "destructive",
      })
      return null
    } finally {
      setIsConvertingStl(false)
    }
  }

  const pollTaskStatus = async (taskId: string) => {
    try {
      const response = await fetch(`/api/task-status?taskId=${taskId}`)

      if (!response.ok) {
        throw new Error("Failed to get task status")
      }

      const data = await response.json()

      if (data.status === "success") {
        setStatus("completed")
        
        // Enhanced model URL handling with validation and logging
        let finalModelUrl: string | null = null;
        
        if (data.modelUrl) {
          console.log("Setting model URL from API response:", data.modelUrl);
          finalModelUrl = data.modelUrl;
        } else {
          console.warn("Task completed but no model URL received in response");
          // Attempt fallback if base model URL is available but not set as modelUrl
          if (data.baseModelUrl) {
            console.log("Using fallback baseModelUrl:", data.baseModelUrl);
            finalModelUrl = data.baseModelUrl;
          } else {
            console.error("No model URL available in API response");
            toast({
              title: "Warning",
              description: "Model generated but the viewer URL may not be available.",
              variant: "destructive",
            });
          }
        }
        
        setModelUrl(finalModelUrl);
        setProgress(100);
        setIsGenerating(false);
        
        // Automatically start STL conversion when model is ready
        if (finalModelUrl) {
          // Start STL conversion
          convertToStl(finalModelUrl);
        }
        
        toast({
          title: "Success!",
          description: "Your 3D model has been generated successfully.",
        });
      } else if (data.status === "failed" || data.status === "cancelled" || data.status === "unknown") {
        setStatus("error")
        setIsGenerating(false)
        toast({
          title: "Error",
          description: "Model generation failed. Please try again.",
          variant: "destructive",
        })
      } else {
        // Still in progress
        setProgress(data.progress || 0)
        // Poll again after a delay
        setTimeout(() => pollTaskStatus(taskId), 2000)
      }
    } catch (error) {
      console.error("Error polling task status:", error)
      setStatus("error")
      setIsGenerating(false)
      toast({
        title: "Error",
        description: "Failed to check model generation status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDownload = async () => {
    if (!modelUrl) return
    
    try {
      // If STL blob already exists, use it directly
      if (stlBlob) {
        const a = document.createElement("a")
        a.href = stlUrl || URL.createObjectURL(stlBlob)
        a.download = "model.stl"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        toast({
          title: "Download complete",
          description: "Your STL file has been downloaded.",
        })
        return
      }
      
      // Otherwise start a new conversion
      setIsDownloading(true)
      toast({
        title: "Processing",
        description: "Converting model to STL format...",
      })

      // Convert GLB to STL
      const blob = await convertToStl(modelUrl)
      if (!blob) return

      // Download the STL file
      const a = document.createElement("a")
      a.href = stlUrl || URL.createObjectURL(blob)
      a.download = "model.stl"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      toast({
        title: "Download complete",
        description: "Your STL file has been downloaded.",
      })
    } catch (error) {
      console.error("Error converting and downloading model:", error)
      toast({
        title: "Error",
        description: "Failed to convert model to STL. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  // Setup the STL viewer when stlUrl changes
  useEffect(() => {
    if (!stlUrl || !stlViewerRef) return;
    
    // Clean up previous viewer if it exists
    while (stlViewerRef.firstChild) {
      stlViewerRef.removeChild(stlViewerRef.firstChild);
    }
    
    // Create the Three.js scene, camera, and renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    
    const camera = new THREE.PerspectiveCamera(
      75, 
      stlViewerRef.clientWidth / stlViewerRef.clientHeight, 
      0.1, 
      1000
    );
    camera.position.set(0, 0, 5);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(stlViewerRef.clientWidth, stlViewerRef.clientHeight);
    stlViewerRef.appendChild(renderer.domElement);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
    backLight.position.set(-1, -1, -1);
    scene.add(backLight);
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    
    // Create material for the STL model
    const material = new THREE.MeshPhongMaterial({
      color: 0x3a86ff,
      specular: 0x111111,
      shininess: 100,
    });
    
    // Load the STL file
    const loader = new STLLoader();
    
    loader.load(
      stlUrl,
      (geometry) => {
        // Center the model
        geometry.center();
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Auto-scale the model to fit in view
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;
        mesh.scale.set(scale, scale, scale);
        
        scene.add(mesh);
        
        // Adjust camera to focus on the model
        controls.update();
      },
      (xhr) => {
        // Loading progress
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
      },
      (error) => {
        console.error('An error occurred loading the STL:', error);
      }
    );
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (!stlViewerRef) return;
      
      camera.aspect = stlViewerRef.clientWidth / stlViewerRef.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(stlViewerRef.clientWidth, stlViewerRef.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Dispose of Three.js resources
      if (renderer) {
        renderer.dispose();
      }
      
      if (controls) {
        controls.dispose();
      }
      
      // Revoke the object URL
      if (stlUrl) {
        URL.revokeObjectURL(stlUrl);
      }
    };
  }, [stlUrl, stlViewerRef]);

  const canGenerate = inputType === "text" ? !!textPrompt.trim() : !!selectedFile;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>3D Model Generator</CardTitle>
          <CardDescription>
            Create detailed 3D models from text descriptions or images. Perfect for characters, creatures, and organic shapes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="text" className="w-full" onValueChange={(v) => setInputType(v as InputType)}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="text">Text to 3D</TabsTrigger>
              <TabsTrigger value="image">Image to 3D</TabsTrigger>
            </TabsList>
            <div className="space-y-4">
              <TabsContent value="text" className="space-y-4">
                <div className="relative">
                  <Textarea
                    placeholder="Describe your 3D model in detail (e.g., a blue dolphin with a curved fin, swimming)"
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    disabled={isGenerating}
                    className="min-h-[120px] pr-10"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-2"
                    onClick={toggleVoiceRecording}
                    disabled={isGenerating}
                  >
                    {isRecording ? (
                      <MicOff className="h-5 w-5 text-red-500" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="image" className="space-y-4">
                <div
                  {...getRootProps()}
                  className={`border-2 ${isDragActive ? "border-primary" : "border-dashed"} rounded-lg p-8 flex flex-col items-center justify-center gap-4 flex-1 cursor-pointer transition-colors ${isGenerating ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
                >
                  <input {...getInputProps()} />
                  {previewUrl ? (
                    <div className="relative w-full h-[300px]">
                      <img
                        src={previewUrl || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                      {!isGenerating && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFile(null)
                            setPreviewUrl(null)
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className={`p-6 rounded-full bg-gray-50 ${isDragActive ? "bg-primary/10" : ""}`}>
                        <Upload className="h-10 w-10 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-medium">
                          {isDragActive ? "Drop the image here" : "Drag and drop an image"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
          <div className="space-y-4">
            {/* Progress bars */}
            {(status === "generating" || status === "uploading") && (
              <div className="mb-4">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {status === "uploading" ? "Uploading image..." : `Generating 3D model: ${progress}% complete`}
                </p>
              </div>
            )}
            
            {isConvertingStl && status === "completed" && (
              <div className="mb-4">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-in-out animate-pulse"
                    style={{ width: "100%" }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Converting model to STL format...
                </p>
              </div>
            )}
            
            {/* STL Viewer */}
            {stlUrl && status === "completed" && (
              <div className="mb-4 bg-gray-100 rounded-lg overflow-hidden border" style={{ height: "200px" }}>
                <div 
                  ref={setStlViewerRef} 
                  className="w-full h-full"
                ></div>
              </div>
            )}
            
            {/* Action buttons when model is ready */}
            {status === "completed" && modelUrl && (
              <div className="flex flex-col gap-2 mb-4">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={handleDownload}
                  disabled={isDownloading || isConvertingStl}
                >
                  {isDownloading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                      Converting to STL...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      Download STL
                    </>
                  )}
                </Button>
                
                <Button
                  className="w-full"
                  variant="default"
                  style={{ backgroundColor: "#ff7b00", color: "white" }}
                  onClick={addToFishCAD}
                  disabled={!stlBlob}
                >
                  Add to FishCAD
                </Button>
                
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={resetState}
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Generate Another 3D Model
                </Button>
              </div>
            )}
            
            {/* Generate button */}
            {(status !== "completed" || !modelUrl) && (
              <Button
                className="w-full"
                size="lg"
                onClick={inputType === "text" ? handleTextSubmit : handleImageSubmit}
                disabled={isGenerating || !canGenerate}
              >
                {isGenerating ? (
                  <>
                    <span className="mr-2">Generating</span>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-5 w-5" />
                    Generate 3D Model
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

