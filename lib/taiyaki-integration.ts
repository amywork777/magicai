"use client";

import { 
  isBrowser, 
  getFilenameFromUrl, 
  extractPageMetadata, 
  debounce, 
  createDomObserver, 
  addWindowListener 
} from '@/lib/browser-utils';

/**
 * Taiyaki Integration for FISHCAD
 * 
 * This module provides functionality to find STL links on a page and
 * add "Add to FISHCAD" buttons next to them. When clicked, these buttons
 * will send the STL file to FISHCAD using a server-proxy approach.
 */

// Button states
enum ButtonState {
  READY = "Open in FISHCAD",
  IMPORTING = "Opening FISHCAD...",
  SENT = "Opened in FISHCAD",
  ERROR = "Error!"
}

// Style for the FISHCAD buttons
const BUTTON_STYLES = {
  default: {
    backgroundColor: "#ff7b00",
    color: "white",
    border: "none",
    padding: "5px 10px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    marginLeft: "8px",
    display: "inline-flex",
    alignItems: "center",
    transition: "all 0.2s ease"
  },
  importing: {
    backgroundColor: "#ffa64d",
    cursor: "default"
  },
  sent: {
    backgroundColor: "#4CAF50"
  },
  error: {
    backgroundColor: "#f44336"
  }
};

// Store active import requests with their buttons for updating
const activeImports = new Map();

// Generate a unique request ID
function generateRequestId() {
  return `stl-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Interface for metadata that will be sent to FISHCAD
interface FileMetadata {
  title?: string;
  source?: string;
  tags?: string[];
  description?: string;
  fileSize?: number;
  [key: string]: any;
}

/**
 * Adds "Open in FISHCAD" buttons next to all STL links on the page
 */
export function addFishcadButtons() {
  if (!isBrowser()) return;
  
  // Find all links that end with .stl or have data-file-type="stl" attribute
  const stlLinks = Array.from(document.querySelectorAll('a')).filter(link => {
    const href = link.getAttribute('href');
    const fileType = link.getAttribute('data-file-type');
    
    return (href && href.toLowerCase().endsWith('.stl')) || 
           fileType === 'stl';
  });
  
  // For each STL link, add a button if it doesn't already exist
  stlLinks.forEach(link => {
    // Check if button already exists
    const nextElement = link.nextElementSibling;
    if (nextElement && nextElement.classList.contains('fishcad-button')) {
      return; // Button already exists
    }
    
    // Create new button
    const button = document.createElement('button');
    button.textContent = ButtonState.READY;
    button.classList.add('fishcad-button');
    button.dataset.stlUrl = link.href;
    
    // Get file name from URL or link text
    let fileName = link.textContent?.trim() || '';
    if (!fileName || fileName === link.href) {
      // Extract filename from URL
      fileName = getFilenameFromUrl(link.href);
    }
    
    // Store the filename in the dataset
    button.dataset.fileName = fileName;
    
    // Apply styles
    Object.assign(button.style, BUTTON_STYLES.default);
    
    // Add click handler
    button.addEventListener('click', (event) => {
      event.preventDefault();
      
      // Update button state
      button.disabled = true;
      button.textContent = ButtonState.IMPORTING;
      Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.importing);
      
      // Get STL URL
      const stlUrl = link.href;
      
      // Store import details in localStorage
      localStorage.setItem('fishcad_pending_import', JSON.stringify({
        fileName: fileName,
        source: window.location.hostname,
        timestamp: Date.now(),
        sourceUrl: window.location.href
      }));
      
      // Trigger download of the STL file
      const downloadLink = document.createElement('a');
      downloadLink.href = stlUrl;
      downloadLink.download = fileName; // Force download
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Clean up the download link
      setTimeout(() => {
        document.body.removeChild(downloadLink);
        
        // Redirect to FISHCAD with special parameter
        window.location.href = "https://fishcad.com/import?pending=true";
        
        // Update button state (in case navigation is canceled)
        setTimeout(() => {
          button.disabled = false;
          button.textContent = ButtonState.READY;
          Object.assign(button.style, BUTTON_STYLES.default);
        }, 5000);
      }, 100); // Short delay to ensure download starts
    });
    
    // Insert button after link
    link.parentNode?.insertBefore(button, link.nextSibling);
  });
}

/**
 * Send a direct request to FISHCAD server API
 */
async function sendDirectServerRequest(requestId: string, stlUrl: string, fileName: string, metadata: FileMetadata) {
  const importData = activeImports.get(requestId);
  if (!importData) return;
  
  const { button } = importData;
  
  try {
    console.log(`Sending direct server request to FISHCAD API for ${fileName}`);
    
    // Update button state
    button.textContent = ButtonState.IMPORTING;
    Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.importing);
    
    // Send POST request to FISHCAD API
    const response = await fetch('https://fishcad.com/api/import-stl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stlUrl,
        fileName,
        source: window.location.href,
        metadata
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Store import ID and start polling for status
      activeImports.set(requestId, {
        ...importData,
        importId: data.importId,
        status: 'importing'
      });
      
      // Begin polling for status updates
      pollImportStatus(requestId, data.importId);
    } else {
      throw new Error(data.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error sending direct server request:', error);
    
    // Show error and reset button
    button.textContent = ButtonState.ERROR;
    Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.error);
    button.disabled = false;
    
    // Reset after delay
    setTimeout(() => {
      button.textContent = ButtonState.READY;
      Object.assign(button.style, BUTTON_STYLES.default);
    }, 3000);
    
    // Remove from active imports
    activeImports.delete(requestId);
  }
}

/**
 * Poll for import status updates
 */
async function pollImportStatus(requestId: string, importId: string) {
  const importData = activeImports.get(requestId);
  if (!importData) return;
  
  const { button } = importData;
  
  try {
    // Try to use socket.io if available
    if (window.io) {
      console.log(`Connecting to socket.io for import ${importId}`);
      
      const socket = window.io('https://fishcad.com');
      
      socket.on('connect', () => {
        console.log('Socket.io connected');
        socket.emit('subscribe-import', importId);
      });
      
      socket.on('import-status', (data) => {
        if (data.importId === importId) {
          updateImportUI(requestId, data.status, data);
        }
      });
      
      socket.on('disconnect', () => {
        console.log('Socket.io disconnected, falling back to polling');
        // Fall back to polling if socket disconnects
        setTimeout(() => pollImportStatus(requestId, importId), 2000);
      });
      
      // Store socket in active imports for later cleanup
      activeImports.set(requestId, {
        ...importData,
        socket
      });
    } else {
      // Fall back to polling
      console.log(`Socket.io not available, polling for import ${importId}`);
      
      const checkStatus = async () => {
        const currentImportData = activeImports.get(requestId);
        if (!currentImportData) return;
        
        // Check if import was completed or failed
        if (['completed', 'failed'].includes(currentImportData.status)) {
          return;
        }
        
        try {
          const response = await fetch(`https://fishcad.com/api/import-status?id=${importId}`);
          
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          // Update UI based on status
          updateImportUI(requestId, data.status, data);
          
          // Continue polling if not completed or failed
          if (!['completed', 'failed'].includes(data.status)) {
            setTimeout(checkStatus, 2000);
          }
        } catch (error) {
          console.error('Error polling import status:', error);
          
          // Try again after longer delay
          setTimeout(checkStatus, 5000);
        }
      };
      
      // Start polling
      checkStatus();
    }
  } catch (error) {
    console.error('Error setting up status polling:', error);
    
    // Show error and reset button
    button.textContent = ButtonState.ERROR;
    Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.error);
    button.disabled = false;
    
    // Reset after delay
    setTimeout(() => {
      button.textContent = ButtonState.READY;
      Object.assign(button.style, BUTTON_STYLES.default);
    }, 3000);
    
    // Remove from active imports
    activeImports.delete(requestId);
  }
}

/**
 * Update the UI based on import status
 */
function updateImportUI(requestId: string, status: string, data: Record<string, any>) {
  const importData = activeImports.get(requestId);
  if (!importData) return;
  
  const { button } = importData;
  
  // Update status in active imports
  activeImports.set(requestId, {
    ...importData,
    status
  });
  
  console.log(`Import ${requestId} status: ${status}`);
  
  // Update button based on status
  switch (status) {
    case 'requesting':
      button.textContent = ButtonState.IMPORTING;
      Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.importing);
      break;
    
    case 'importing':
      button.textContent = ButtonState.IMPORTING;
      Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.importing);
      break;
    
    case 'processing':
      button.textContent = ButtonState.IMPORTING;
      Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.importing);
      break;
    
    case 'completed':
      button.textContent = ButtonState.SENT;
      Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.sent);
      button.disabled = false;
      
      // Change button to "Open in FISHCAD" after short delay
      setTimeout(() => {
        if (data.modelUrl) {
          button.textContent = "Open in FISHCAD";
          button.onclick = (e: MouseEvent) => {
            e.preventDefault();
            window.open(data.modelUrl, '_blank');
          };
        } else {
          // Reset button after a delay if no model URL
          setTimeout(() => {
            button.textContent = ButtonState.READY;
            Object.assign(button.style, BUTTON_STYLES.default);
          }, 3000);
        }
      }, 1500);
      
      // Clean up
      if (importData.socket) {
        importData.socket.disconnect();
      }
      break;
    
    case 'failed':
      button.textContent = ButtonState.ERROR;
      Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.error);
      button.disabled = false;
      
      // Show error message if available
      if (data.error) {
        console.error(`Import error: ${data.error}`);
      }
      
      // Reset button after a delay
      setTimeout(() => {
        button.textContent = ButtonState.READY;
        Object.assign(button.style, BUTTON_STYLES.default);
      }, 3000);
      
      // Clean up
      if (importData.socket) {
        importData.socket.disconnect();
      }
      break;
    
    default:
      // Unknown status
      console.warn(`Unknown import status: ${status}`);
  }
}

/**
 * Handles response messages from FISHCAD
 */
export function handleResponseFromFishcad(event: MessageEvent) {
  if (!isBrowser()) return;
  
  // Verify origin (in production)
  // if (event.origin !== 'https://fishcad.com') return;
  
  const data: any = event.data;
  console.log("Received message in Taiyaki integration:", data);
  
  // With the new approach using localStorage and direct navigation,
  // we don't need to handle most response messages from FISHCAD.
  // However, we're keeping this function for future extension
  // or for backward compatibility.
  
  // Handle test messages for the StlDemo component
  if (data && data.type === 'stl-proxy-response' && data.requestId) {
    console.log("Received test response:", data);
  }
}

/**
 * Sets up an observer for dynamic content to add buttons to new STL links
 */
export function setupDynamicContentObserver() {
  if (!isBrowser()) return { disconnect: () => {} };
  
  // Create a debounced version of addFishcadButtons to prevent too many calls
  const debouncedAddButtons = debounce(addFishcadButtons, 300);
  
  // Create and return the observer
  return createDomObserver((mutations) => {
    // Check if any mutations might have added new links
    const shouldCheck = mutations.some(mutation => 
      mutation.type === 'childList' || 
      (mutation.type === 'attributes' && 
       mutation.attributeName === 'href')
    );
    
    if (shouldCheck) {
      debouncedAddButtons();
    }
  });
}

/**
 * Sets up URL change detection for single page applications
 */
export function setupUrlChangeDetection() {
  if (!isBrowser()) return 0;
  
  let lastUrl = window.location.href;
  
  // Check for URL changes periodically
  const interval = setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      // URL has changed, wait a bit for content to load then add buttons
      setTimeout(addFishcadButtons, 500);
    }
  }, 1000);
  
  return interval;
}

/**
 * Initialize the Taiyaki integration
 */
export function initializeTaiyakiIntegration() {
  if (!isBrowser()) return () => {};
  
  // Add buttons to initial content
  // Slight delay to ensure DOM is fully loaded
  setTimeout(addFishcadButtons, 200);
  
  // Set up event listener for messages from FISHCAD (for testing)
  const cleanupMessageListener = addWindowListener('message', handleResponseFromFishcad);
  
  // Set up observer for dynamic content
  const observer = setupDynamicContentObserver();
  
  // Set up detection for URL changes in single page apps
  const urlChangeInterval = setupUrlChangeDetection();
  
  // Return cleanup function
  return () => {
    cleanupMessageListener();
    if (observer && typeof observer.disconnect === 'function') {
      observer.disconnect();
    }
    clearInterval(urlChangeInterval);
  };
}

// For TypeScript
declare global {
  interface Window {
    io?: any;
  }
}

// Export the main functions for individual use
export default initializeTaiyakiIntegration; 