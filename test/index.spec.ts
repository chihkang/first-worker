// test/index.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../src/index';
import { processData } from '../src/utils/dataProcessor';

// 模擬 dataProcessor 模塊
vi.mock('../src/utils/dataProcessor', () => ({
  processData: vi.fn().mockImplementation((data) => {
    return {
      summary: {
        startValue: 1000,
        endValue: 1100,
        change: 100,
        percentChange: 10
      },
      dailyData: [
        { date: '2023-01-01', value: 1000 },
        { date: '2023-01-02', value: 1050 },
        { date: '2023-01-03', value: 1100 }
      ]
    };
  })
}));

describe('Portfolio Tracker Worker', () => {
  // 在每個測試前重置模擬
  beforeEach(() => {
    vi.resetAllMocks();
    
    // 模擬全局 fetch
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      console.log('Mocked fetch called with:', url);
      return new Response(JSON.stringify({ 
        data: [
          { date: '2023-01-01', value: 1000 },
          { date: '2023-01-02', value: 1050 },
          { date: '2023-01-03', value: 1100 }
        ] 
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    });
  });

  it('serves static assets', async () => {
    const request = new Request('http://example.com/');
    
    const env = {
      PORTFOLIO_CACHE: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      },
      API_BASE_URL: 'https://portfoliomanager-production.up.railway.app',
      PORTFOLIO_ID: '67283d5d447a55a757f87db7',
      ASSETS: {
        fetch: vi.fn().mockImplementation(async (req) => {
          return new Response('<!DOCTYPE html><html><body>Static Asset</body></html>', {
            headers: { 'Content-Type': 'text/html' },
          });
        }),
      },
    };
    
    const response = await worker.fetch(request, env);
    
    expect(response.status).toBe(200);
    expect(env.ASSETS.fetch).toHaveBeenCalled();
  });

  it('handles API requests', async () => {
    const request = new Request('http://example.com/api/portfolio?range=3');
    
    const env = {
      PORTFOLIO_CACHE: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      },
      API_BASE_URL: 'https://portfoliomanager-production.up.railway.app',
      PORTFOLIO_ID: '67283d5d447a55a757f87db7',
      ASSETS: {
        fetch: vi.fn(),
      },
    };
    
    const response = await worker.fetch(request, env);
    
    // 添加調試信息
    console.log('Response status:', response.status);
    if (response.status !== 200) {
      const text = await response.clone().text();
      console.log('Response body:', text);
    }
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
  });

  it('handles CORS preflight requests', async () => {
    const request = new Request('http://example.com/api/portfolio', {
      method: 'OPTIONS',
    });
    
    const env = {
      PORTFOLIO_CACHE: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      },
      // 使用環境變數或默認值
      API_BASE_URL: process.env.TEST_API_BASE_URL || 'https://example.com',
      PORTFOLIO_ID: process.env.TEST_PORTFOLIO_ID || 'test-id',
      ASSETS: {
        fetch: vi.fn(),
      },
    };
    
    const response = await worker.fetch(request, env);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
