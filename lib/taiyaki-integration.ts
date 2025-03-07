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
 * will send the STL file to FISHCAD.
 */

// Button states
enum ButtonState {
  READY = "Add to FISHCAD",
  SENDING = "Sending...",
  SENT = "Sent to FISHCAD",
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
  sending: {
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

// Interface for metadata that will be sent to FISHCAD
interface FileMetadata {
  title?: string;
  source?: string;
  tags?: string[];
  description?: string;
  [key: string]: any;
}

/**
 * Adds "Add to FISHCAD" buttons next to all STL links on the page
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
      
      // Get STL URL
      const stlUrl = link.href;
      
      // Gather metadata
      const baseMetadata = extractPageMetadata();
      const metadata: FileMetadata = {
        ...baseMetadata,
        title: fileName,
      };
      
      // Update button state
      button.textContent = ButtonState.SENDING;
      Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.sending);
      
      // Send message to parent window
      fetchAndSendStlFile(stlUrl, fileName, metadata, button);
    });
    
    // Insert button after link
    link.parentNode?.insertBefore(button, link.nextSibling);
  });
}

// When a button is clicked, fetch the STL file and send it as base64 data
const fetchAndSendStlFile = async (url: string, fileName: string, metadata: FileMetadata, button: HTMLElement) => {
  try {
    // Update button to sending state
    button.textContent = ButtonState.SENDING;
    Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.sending);
    
    // Fetch the STL file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch STL file: ${response.status} ${response.statusText}`);
    }
    
    // Get the STL file as a blob
    const blob = await response.blob();
    console.log(`STL blob size: ${blob.size} bytes`);
    
    // Convert the blob to base64
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    
    reader.onload = () => {
      // Get the base64 data
      const base64Data = reader.result as string;
      console.log(`Base64 data length: ${base64Data.length} characters`);
      
      // Log sending message
      console.log("Sending STL model to FISHCAD with enhanced compatibility...");
      
      // Try different message formats that FISHCAD might expect
      
      // Format 1: Original format with stlData
      window.parent.postMessage({
        type: "stl-import",
        stlData: base64Data,
        fileName,
        metadata
      }, "*");
      
      // Format 2: Alternative format with data property
      setTimeout(() => {
        window.parent.postMessage({
          type: "stl-import",
          data: base64Data,
          fileName,
          metadata
        }, "*");
      }, 100);
      
      // Format 3: Simple format with minimal data
      setTimeout(() => {
        window.parent.postMessage({
          type: "stl-import",
          stl: base64Data,
          name: fileName
        }, "*");
      }, 200);
      
      // Update button after delay
      setTimeout(() => {
        button.textContent = ButtonState.SENT;
        Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.sent);
        
        // Reset button after another delay
        setTimeout(() => {
          button.textContent = ButtonState.READY;
          Object.assign(button.style, BUTTON_STYLES.default);
        }, 3000);
      }, 1000);
    };
    
    reader.onerror = () => {
      // Handle error
      button.textContent = ButtonState.ERROR;
      Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.error);
      
      // Reset after a delay
      setTimeout(() => {
        button.textContent = ButtonState.READY;
        Object.assign(button.style, BUTTON_STYLES.default);
      }, 3000);
    };
  } catch (error) {
    console.error("Error fetching STL file:", error);
    
    // Update button to show error
    button.textContent = ButtonState.ERROR;
    Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.error);
    
    // Reset button after a delay
    setTimeout(() => {
      button.textContent = ButtonState.READY;
      Object.assign(button.style, BUTTON_STYLES.default);
    }, 3000);
  }
};

/**
 * Handles response messages from FISHCAD
 */
export function handleResponseFromFishcad(event: MessageEvent) {
  if (!isBrowser()) return;
  
  // Verify origin (in production)
  // if (event.origin !== 'https://fishcad.com') return;
  
  const data = event.data;
  console.log("Received message in Taiyaki integration:", data);
  
  // Check if the message is a response from FISHCAD (handle multiple possible formats)
  if (data && 
      (data.type === 'stl-import-response' || 
       data.action === 'stl-import-response' || 
       data.type === 'import-response' || 
       (data.type === 'response' && data.for === 'stl-import'))) {
    
    console.log("FISHCAD response received in Taiyaki integration:", data);
    
    // Find all buttons that might match
    const buttons = document.querySelectorAll('.fishcad-button');
    let button: HTMLElement | undefined;
    
    // Try to find matching button by fileName
    if (data.fileName) {
      button = Array.from(buttons).find(
        btn => (btn as HTMLElement).dataset.fileName === data.fileName
      ) as HTMLElement | undefined;
    }
    
    // If no button found by fileName, just use the last one that was clicked
    if (!button && buttons.length > 0) {
      // Use the most recently used button
      const buttonsArray = Array.from(buttons) as HTMLElement[];
      button = buttonsArray.find(btn => 
        btn.textContent === ButtonState.SENDING
      ) || buttonsArray[buttonsArray.length - 1];
    }
    
    if (button) {
      if (data.success) {
        // Success state
        button.textContent = ButtonState.SENT;
        Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.sent);
      } else {
        // Error state
        console.error("FISHCAD import error:", data.error || "Unknown error");
        button.textContent = ButtonState.ERROR;
        Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.error);
      }
      
      // Reset button after delay
      setTimeout(() => {
        button.textContent = ButtonState.READY;
        Object.assign(button.style, BUTTON_STYLES.default);
      }, 3000);
    }
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
  
  // Set up event listener for messages from FISHCAD
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

// Export the main functions for individual use
export default initializeTaiyakiIntegration; 