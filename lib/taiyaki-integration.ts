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
    
    // Apply styles
    Object.assign(button.style, BUTTON_STYLES.default);
    
    // Add click handler
    button.addEventListener('click', (event) => {
      event.preventDefault();
      
      // Get STL URL
      const stlUrl = link.href;
      
      // Get file name from URL or link text
      let fileName = link.textContent?.trim() || '';
      if (!fileName || fileName === stlUrl) {
        // Extract filename from URL
        fileName = getFilenameFromUrl(stlUrl);
      }
      
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
      window.parent.postMessage({
        type: "stl-import",
        stlUrl,
        fileName,
        metadata
      }, "*");  // In production, replace "*" with "https://fishcad.com"
      
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
    });
    
    // Insert button after link
    link.parentNode?.insertBefore(button, link.nextSibling);
  });
}

/**
 * Handles response messages from FISHCAD
 */
export function handleResponseFromFishcad(event: MessageEvent) {
  if (!isBrowser()) return;
  
  // Verify origin (in production)
  // if (event.origin !== 'https://fishcad.com') return;
  
  const data = event.data;
  
  // Check if the message is a response from FISHCAD
  if (data && data.type === 'stl-import-response') {
    // Find the button associated with the file
    const buttons = document.querySelectorAll('.fishcad-button');
    const button = Array.from(buttons).find(
      btn => (btn as HTMLElement).dataset.stlUrl === data.stlUrl
    ) as HTMLElement | undefined;
    
    if (button) {
      if (data.success) {
        // Success state
        button.textContent = ButtonState.SENT;
        Object.assign(button.style, BUTTON_STYLES.default, BUTTON_STYLES.sent);
      } else {
        // Error state
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