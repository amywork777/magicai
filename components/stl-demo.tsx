"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * STL Demo Component
 * 
 * This component demonstrates the Taiyaki integration by displaying
 * links to STL files that should have "Add to FISHCAD" buttons added to them.
 */
export function StlDemo() {
  const [showDemo, setShowDemo] = useState(false);
  
  // Sample STL files
  const sampleStlFiles = [
    {
      name: "Dolphin Model",
      url: "https://example.com/models/dolphin.stl",
      description: "A detailed 3D model of a dolphin"
    },
    {
      name: "Shark Model",
      url: "https://example.com/models/shark.stl",
      description: "A realistic 3D model of a shark"
    },
    {
      name: "Fish Collection",
      url: "https://example.com/models/tropical-fish.stl",
      description: "A collection of tropical fish models"
    },
    {
      name: "Whale Model",
      url: "https://example.com/models/whale.stl",
      description: "A large whale 3D model"
    }
  ];
  
  return (
    <Card className="w-full max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>STL File Integration Demo</CardTitle>
        <CardDescription>
          This demo shows how "Add to FISHCAD" buttons are automatically added to STL links
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex justify-center">
            <Button 
              onClick={() => setShowDemo(!showDemo)}
              variant="outline"
            >
              {showDemo ? "Hide Demo Files" : "Show Demo Files"}
            </Button>
          </div>
          
          {showDemo && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-gray-500">
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
                      newLink.href = `https://example.com/models/random-${Math.floor(Math.random() * 1000)}.stl`;
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
              
              <div className="mt-4 p-4 border border-yellow-200 bg-yellow-50 rounded-md">
                <h3 className="font-medium text-yellow-800 mb-2">Test Information</h3>
                <p className="text-sm text-yellow-700">
                  The "Add to FISHCAD" buttons will send messages to the parent window, but since we're not in an iframe inside FISHCAD, you'll only see the button state changes. In a real integration, FISHCAD would receive these messages and respond.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StlDemo; 