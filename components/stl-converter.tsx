"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { convertGlbToStl } from "@/lib/stl-utils"

interface STLConverterProps {
  modelUrl: string | null
}

export function STLConverter({ modelUrl }: STLConverterProps) {
  const [isConverting, setIsConverting] = useState(false)
  const { toast } = useToast()

  const handleConvertAndDownload = async () => {
    if (!modelUrl) return

    try {
      setIsConverting(true)
      toast({
        title: "Processing",
        description: "Converting model to STL format...",
      })

      // Convert GLB to STL
      const stlBlob = await convertGlbToStl(modelUrl)

      // Download the STL file
      const url = window.URL.createObjectURL(stlBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = "model.stl"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
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
      setIsConverting(false)
    }
  }

  return (
    <Button onClick={handleConvertAndDownload} className="gap-2" disabled={isConverting || !modelUrl}>
      {isConverting ? (
        <>
          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
          Converting...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Download STL
        </>
      )}
    </Button>
  )
}

