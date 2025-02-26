/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// src/index.ts
// src/index.ts
import { processData } from './utils/dataProcessor';

interface Env {
  ASSETS: Fetcher;
  PORTFOLIO_CACHE: KVNamespace;
}

// Helper function to add CORS headers
function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return headers;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(request)
      });
    }
    
    const url = new URL(request.url);
    
    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
      // Portfolio data API endpoint
      if (url.pathname === '/api/portfolio') {
        try {
          // Check cache first (if you're using KV)
          const cachedData = await env.PORTFOLIO_CACHE.get('latest');
          if (cachedData) {
            return new Response(cachedData, {
              headers: {
                ...corsHeaders(request),
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=3600'
              }
            });
          }
          // Fetch data from the external API
          const apiResponse = await fetch(
            'https://portfoliomanager-production.up.railway.app/api/PortfolioDailyValue/67283d5d447a55a757f87db7/history?range=3',
            {
              headers: {
                'Accept': 'application/json'
              }
            }
          );
          
          if (!apiResponse.ok) {
            return new Response(`Failed to load portfolio data: ${apiResponse.status} ${apiResponse.statusText}`, { 
              status: apiResponse.status,
              headers: corsHeaders(request)
            });
          }
          
          const data = await apiResponse.json();
          const processedData = processData(data);
          // Cache the processed data (if you're using KV)
          await env.PORTFOLIO_CACHE.put('latest', JSON.stringify(processedData), {
            expirationTtl: 3600 // Cache for 1 hour
          });
          // Return the processed data with CORS headers
          return new Response(JSON.stringify(processedData), {
            headers: {
              ...corsHeaders(request),
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.error('Error fetching portfolio data:', error);
          return new Response(`Internal server error: ${error instanceof Error ? error.message : String(error)}`, { 
            status: 500,
            headers: corsHeaders(request)
          });
        }
      }
      
      return new Response('Not found', { 
        status: 404,
        headers: corsHeaders(request)
      });
    }
    
    // Serve static assets
    return env.ASSETS.fetch(request);
  },
};
