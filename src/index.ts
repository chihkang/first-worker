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
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
      // Portfolio data API endpoint
      if (url.pathname === '/api/portfolio') {
        try {
          // Fetch the portfolio data from your static assets
          const response = await env.ASSETS.fetch(new Request(`${url.origin}/data/portfolio.json`));
          if (!response.ok) {
            return new Response('Failed to load portfolio data', { status: 500 });
          }
          
          const data = await response.json();
          const processedData = processData(data);
          
          return Response.json(processedData);
        } catch (error) {
          console.error('Error fetching portfolio data:', error);
          return new Response('Internal server error', { status: 500 });
        }
      }
      
      return new Response('Not found', { status: 404 });
    }
    
    // Serve static assets
    return env.ASSETS.fetch(request);
  },
};
