"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight, Check, Loader2 } from "lucide-react";

/**
 * STL Demo Component
 * 
 * This component demonstrates the Taiyaki integration by displaying
 * links to STL files that should have "open in fishcad using import" text links added to them.
 */
export function StlDemo() {
  const [showDemo, setShowDemo] = useState(false);
  const [testMode, setTestMode] = useState<'links' | 'localStorage'>('links');
  const [localStorageContent, setLocalStorageContent] = useState<string>("");
  
  // Sample STL files (now with real URLs for testing)
  const sampleStlFiles = [
    {
      name: "Dolphin Model",
      url: "https://storage.googleapis.com/ucloud-v3/ccab50f18aa14101a75a.stl",
      description: "A detailed 3D model of a dolphin"
    },
    {
      name: "Shark Model",
      url: "https://storage.googleapis.com/ucloud-v3/d077c28678c00e8fb478.stl",
      description: "A realistic 3D model of a shark"
    },
    {
      name: "Fish Collection",
      url: "https://storage.googleapis.com/ucloud-v3/29d9bca8a75e61cad734.stl",
      description: "A collection of tropical fish models"
    },
    {
      name: "Whale Model",
      url: "https://storage.googleapis.com/ucloud-v3/6d2a17a25fcbe1d28a8b.stl",
      description: "A large whale 3D model"
    }
  ];
  
  // Check localStorage for pending FISHCAD imports
  useEffect(() => {
    const checkLocalStorage = () => {
      const pendingImport = localStorage.getItem('fishcad_pending_import');
      if (pendingImport) {
        try {
          setLocalStorageContent(JSON.stringify(JSON.parse(pendingImport), null, 2));
        } catch (e) {
          setLocalStorageContent(pendingImport);
        }
      } else {
        setLocalStorageContent("No pending import found in localStorage");
      }
    };
    
    // Check when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkLocalStorage();
      }
    };
    
    // Initial check
    checkLocalStorage();
    
    // Set up interval to check periodically
    const interval = setInterval(checkLocalStorage, 2000);
    
    // Set up visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Simulate setting up a pending import in localStorage
  const simulateLocalStoragePendingImport = () => {
    const importData = {
      fileName: "test-model.stl",
      source: window.location.hostname,
      sourceUrl: window.location.href,
      timestamp: Date.now()
    };
    
    localStorage.setItem('fishcad_pending_import', JSON.stringify(importData));
    setLocalStorageContent(JSON.stringify(importData, null, 2));
  };
  
  // Clear localStorage
  const clearLocalStorage = () => {
    localStorage.removeItem('fishcad_pending_import');
    setLocalStorageContent("No pending import found in localStorage");
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>FISHCAD Integration Demo</CardTitle>
        <CardDescription>
          Test the new localStorage-based integration for sending STL files to FISHCAD
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex justify-center">
            <Button 
              onClick={() => setShowDemo(!showDemo)}
              variant="outline"
            >
              {showDemo ? "Hide Demo" : "Show Demo"}
            </Button>
          </div>
          
          {showDemo && (
            <div className="space-y-4 mt-4">
              <Tabs defaultValue="links" onValueChange={(v) => setTestMode(v as 'links' | 'localStorage')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="links">Link Demo</TabsTrigger>
                  <TabsTrigger value="localStorage">localStorage Test</TabsTrigger>
                </TabsList>
                
                <TabsContent value="links" className="mt-4">
                  <p className="text-sm text-gray-500 mb-4">
                    The links below should have "open in fishcad using import" text links added to them.
                    These links are automatically added by the Taiyaki integration.
                  </p>
                  
                  <ul className="space-y-3 list-disc pl-5">
                    {sampleStlFiles.map((file, index) => (
                      <li key={index} className="text-sm">
                        <a 
                          href={file.url} 
                          className="text-blue-600 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {file.name}
                        </a>
                        <span className="text-gray-500 ml-2">- {file.description}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-6 p-4 bg-gray-100 rounded-md">
                    <h3 className="font-medium mb-2">Dynamic Content Test</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      This button will add a new STL link dynamically. The Taiyaki integration should detect it and add a text link.
                    </p>
                    <Button
                      onClick={() => {
                        const container = document.getElementById('dynamic-link-container');
                        if (container) {
                          const linkWrapper = document.createElement('div');
                          linkWrapper.className = 'mt-2';
                          
                          const newLink = document.createElement('a');
                          // Use a real STL URL that exists
                          const randomFile = sampleStlFiles[Math.floor(Math.random() * sampleStlFiles.length)];
                          newLink.href = randomFile.url;
                          newLink.textContent = `Dynamic Fish Model #${Math.floor(Math.random() * 100)}`;
                          newLink.className = 'text-blue-600 hover:underline';
                          
                          linkWrapper.appendChild(newLink);
                          container.appendChild(linkWrapper);
                        }
                      }}
                      size="sm"
                    >
                      Add Dynamic STL Link
                    </Button>
                    <div id="dynamic-link-container" className="mt-3"></div>
                  </div>
                </TabsContent>
                
                <TabsContent value="localStorage" className="mt-4">
                  <div className="p-4 border rounded-md space-y-4">
                    <h3 className="font-semibold text-lg">localStorage Integration Test</h3>
                    <p className="text-sm text-gray-600">
                      This test simulates the localStorage-based approach for sending STL files to FISHCAD.
                      When a user clicks the "open in fishcad using import" link, it stores information in localStorage,
                      downloads the STL file, and then redirects to FISHCAD.
                    </p>
                    
                    <div className="my-4 p-4 bg-gray-50 rounded-md">
                      <h4 className="font-medium mb-2">localStorage Content</h4>
                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                        {localStorageContent}
                      </pre>
                      
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={simulateLocalStoragePendingImport}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Simulate Pending Import
                        </Button>
                        
                        <Button
                          onClick={clearLocalStorage}
                          size="sm"
                          variant="outline"
                        >
                          Clear localStorage
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <h4 className="font-medium text-blue-800 flex items-center gap-2">
                        <AlertCircle size={16} />
                        How It Works
                      </h4>
                      <ol className="mt-2 text-sm text-blue-700 space-y-2 pl-5 list-decimal">
                        <li>When user clicks "open in fishcad using import" link, we store file info in localStorage</li>
                        <li>The browser downloads the STL file to the user's computer</li>
                        <li>The page then redirects to FISHCAD's import page</li>
                        <li>FISHCAD reads from localStorage to know a file is pending import</li>
                        <li>FISHCAD guides the user to select the downloaded file</li>
                        <li>The file is imported with all the metadata preserved</li>
                      </ol>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StlDemo; 