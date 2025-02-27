// src/index.ts
import { processData } from './utils/dataProcessor';

interface Env {
  ASSETS: Fetcher;
  PORTFOLIO_CACHE: KVNamespace;
  API_BASE_URL: string;
  PORTFOLIO_ID: string;
}

// 幫助函數添加 CORS 頭
function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return headers;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 處理 CORS 預檢請求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(request)
      });
    }
    
    const url = new URL(request.url);
    console.log('Request URL:', url.toString());
  
    // 處理 API 請求
    if (url.pathname.startsWith('/api/')) {
      // 投資組合數據 API 端點
      if (url.pathname === '/api/portfolio') {
        try {
          // 從 URL 獲取範圍參數，默認為 3
          const range = url.searchParams.get('range') || '3';
          // 添加一個查詢參數來強制刷新緩存
          const forceRefresh = url.searchParams.get('refresh') === 'true';
          console.log('Requested range:', range);
          
          // 使用範圍作為緩存鍵
          const cacheKey = `portfolio-range-${range}`;
          
          // 首先檢查緩存
          if (!forceRefresh) {
            const cachedData = await env.PORTFOLIO_CACHE.get(cacheKey);
            if (cachedData) {
              console.log('Cache hit for range:', range);
              return new Response(cachedData, {
                headers: {
                  ...corsHeaders(request),
                  'Content-Type': 'application/json',
                  'Cache-Control': 'max-age=3600'
                }
              });
            }
          }
          // 從外部 API 獲取數據
          const apiUrl = `${env.API_BASE_URL}/api/PortfolioDailyValue/${env.PORTFOLIO_ID}/history?range=${range}`;
          console.log('Fetching from API:', apiUrl);
          
          const apiResponse = await fetch(
            apiUrl,
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
          console.log('API response received, processing data...');
          const processedData = processData(data);
          
          // 緩存處理後的數據
          await env.PORTFOLIO_CACHE.put(cacheKey, JSON.stringify(processedData), {
            expirationTtl: 3600 // 緩存 1 小時
          });
          console.log('Data cached with key:', cacheKey);
          
          // 返回處理後的數據，帶有 CORS 頭
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
    
    // 提供靜態資產
    return env.ASSETS.fetch(request);
  },
};
