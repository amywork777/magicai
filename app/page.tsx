import { ModelGenerator } from "../components/model-generator"
import { Toaster } from "../components/ui/toaster"
import { StlDemo } from "../components/stl-demo"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 container mx-auto py-12 px-4">
        <ModelGenerator />
        
        {/* Taiyaki Integration Demo */}
        <div className="mt-12 mb-6">
          <h2 className="text-2xl font-bold text-center mb-4">FISHCAD Integration Demo</h2>
          <StlDemo />
        </div>
      </div>
      <Toaster />
    </main>
  )
}

