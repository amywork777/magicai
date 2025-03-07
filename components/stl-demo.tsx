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
 * links to STL files that should have "Add to FISHCAD" buttons added to them.
 */
export function StlDemo() {
  const [showDemo, setShowDemo] = useState(false);
  const [testMode, setTestMode] = useState<'buttons' | 'proxy'>('buttons');
  const [proxyStatus, setProxyStatus] = useState<string | null>(null);
  const [proxyResult, setProxyResult] = useState<'success' | 'failure' | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  
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
  
  // Handle messages from FISHCAD (for testing)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("Demo received message:", event.data);
      
      // Handle proxy responses
      if (event.data && event.data.type === 'stl-proxy-response') {
        setProxyStatus(event.data.status);
        
        if (event.data.status === 'completed') {
          setProxyResult('success');
          setIsTestRunning(false);
        } else if (event.data.status === 'failed') {
          setProxyResult('failure');
          setIsTestRunning(false);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);
  
  // Test the server proxy approach
  const testServerProxyApproach = () => {
    setIsTestRunning(true);
    setProxyStatus('requesting');
    setProxyResult(null);
    
    // Generate a unique request ID
    const requestId = `stl-test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Send a proxy request message
    window.parent.postMessage({
      type: "stl-proxy-request",
      requestId,
      fileName: "test-model.stl",
      stlUrl: "https://storage.googleapis.com/ucloud-v3/ccab50f18aa14101a75a.stl",
      metadata: {
        title: "Test Model",
        source: window.location.href,
        tags: ["test", "demo"],
        description: "A test model for the demo"
      }
    }, "*");
    
    // Simulate the importing status after a delay
    setTimeout(() => {
      setProxyStatus('importing');
      
      // Simulate the processing status after a delay
      setTimeout(() => {
        setProxyStatus('processing');
        
        // Simulate the completion after a delay
        setTimeout(() => {
          setProxyStatus('completed');
          setProxyResult('success');
          setIsTestRunning(false);
          
          // Simulate a response from FISHCAD
          window.postMessage({
            type: 'stl-proxy-response',
            requestId,
            status: 'completed',
            success: true,
            modelUrl: 'https://fishcad.com/model/test-123'
          }, "*");
        }, 3000);
      }, 3000);
    }, 3000);
  };
  
  // Render the appropriate status badge
  const renderStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const badgeStyles = {
      requesting: { variant: "outline", className: "bg-blue-50 text-blue-700 border-blue-300" },
      importing: { variant: "outline", className: "bg-yellow-50 text-yellow-700 border-yellow-300" },
      processing: { variant: "outline", className: "bg-purple-50 text-purple-700 border-purple-300" },
      completed: { variant: "outline", className: "bg-green-50 text-green-700 border-green-300" },
      failed: { variant: "outline", className: "bg-red-50 text-red-700 border-red-300" }
    };
    
    const badgeStyle = badgeStyles[status as keyof typeof badgeStyles] || 
                      { variant: "outline", className: "bg-gray-50 text-gray-700 border-gray-300" };
    
    return (
      <Badge variant="outline" className={badgeStyle.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>FISHCAD Integration Demo</CardTitle>
        <CardDescription>
          Test the new server-proxy integration for sending STL files to FISHCAD
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
              <Tabs defaultValue="buttons" onValueChange={(v) => setTestMode(v as 'buttons' | 'proxy')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="buttons">Button Demo</TabsTrigger>
                  <TabsTrigger value="proxy">Server-Proxy Test</TabsTrigger>
                </TabsList>
                
                <TabsContent value="buttons" className="mt-4">
                  <p className="text-sm text-gray-500 mb-4">
                    The links below should have "Add to FISHCAD" buttons next to them.
                    These buttons are automatically added by the Taiyaki integration.
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
                      This button will add a new STL link dynamically. The Taiyaki integration should detect it and add a button.
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
                
                <TabsContent value="proxy" className="mt-4">
                  <div className="p-4 border rounded-md space-y-4">
                    <h3 className="font-semibold text-lg">Server-Proxy Integration Test</h3>
                    <p className="text-sm text-gray-600">
                      This test simulates the new server-proxy approach for sending large STL files to FISHCAD.
                      Instead of trying to send the entire STL file through the browser, only the URL is sent and
                      FISHCAD's server downloads it directly.
                    </p>
                    
                    <div className="my-4 p-4 bg-gray-50 rounded-md">
                      <h4 className="font-medium mb-2">Test Status</h4>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium w-24">Status:</span>
                          {proxyStatus ? renderStatusBadge(proxyStatus) : <span className="text-sm text-gray-500">Not started</span>}
                        </div>
                        
                        {proxyResult && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium w-24">Result:</span>
                            {proxyResult === 'success' ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <Check size={16} />
                                <span>Success</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertCircle size={16} />
                                <span>Failed</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {proxyStatus === 'completed' && (
                          <div className="mt-2 p-2 bg-green-50 text-green-700 rounded border border-green-200 text-sm">
                            <p>Model was successfully sent to FISHCAD!</p>
                            <a href="https://fishcad.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:underline mt-1">
                              <span>View model on FISHCAD</span>
                              <ArrowRight size={14} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={testServerProxyApproach}
                      disabled={isTestRunning}
                      className="w-full"
                    >
                      {isTestRunning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing Server-Proxy Integration...
                        </>
                      ) : (
                        "Test Server-Proxy Integration"
                      )}
                    </Button>
                  </div>
                  
                  <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-md">
                    <h3 className="font-medium text-blue-800 mb-2">Technical Information</h3>
                    <p className="text-sm text-blue-700">
                      The server-proxy approach enables reliable transfer of large STL files by sending only a URL to FISHCAD. 
                      FISHCAD's server then downloads the file directly, avoiding browser size limitations.
                    </p>
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