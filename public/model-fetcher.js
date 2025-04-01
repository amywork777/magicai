// Model Fetcher Script
// This script helps bypass CORS restrictions by fetching models through a fetch API with proper credentials

// Function to fetch a model with all possible CORS workarounds
async function fetchModel(url) {
  console.log('Model fetcher: Attempting to fetch model from:', url);
  
  try {
    // First try: Basic fetch with cors mode and include credentials
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': window.location.origin,
        'Referer': window.location.origin
      }
    });
    
    if (response.ok) {
      console.log('Model fetcher: Successful fetch with mode=cors');
      return response;
    }
    
    throw new Error(`First fetch attempt failed: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error('Model fetcher: First attempt failed:', error);
    
    try {
      // Second try: Using no-cors mode (will be opaque but might work for GLB)
      console.log('Model fetcher: Trying no-cors mode');
      const response = await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        credentials: 'include',
        headers: {
          'Accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        }
      });
      
      // Note: with no-cors, response.ok will always be false, so we just check if we got a response
      if (response) {
        console.log('Model fetcher: Got response with no-cors mode');
        return response;
      }
      
      throw new Error('Second fetch attempt failed');
    } catch (error2) {
      console.error('Model fetcher: Second attempt failed:', error2);
      
      // Final attempt: Try using our proxy
      console.log('Model fetcher: Trying through proxy');
      const proxyUrl = `/api/proxy-model?url=${encodeURIComponent(url)}`;
      
      try {
        const response = await fetch(proxyUrl);
        if (response.ok) {
          console.log('Model fetcher: Successful fetch through proxy');
          return response;
        }
        throw new Error(`Proxy fetch failed: ${response.status} ${response.statusText}`);
      } catch (error3) {
        console.error('Model fetcher: All fetch attempts failed:', error3);
        throw new Error('All fetch attempts failed. Unable to load model.');
      }
    }
  }
}

// Export the function globally
window.fetchModel = fetchModel;

// Notify that the fetcher is loaded
console.log('Model fetcher loaded and ready'); 