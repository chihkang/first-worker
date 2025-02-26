# Portfolio Tracker - Cloudflare Workers 專案

這是一個使用 Cloudflare Workers 構建的投資組合追蹤應用程式，可以視覺化顯示投資組合的歷史表現。該應用程式使用 TypeScript 開發，並利用 D3.js 創建互動式圖表。

![portfolio](/Users/chihkanglin/PlayGround/cloudflare/first-worker/first-worker/portfolio.jpeg)

## 功能特點

- 顯示投資組合的歷史價值變化
- 支持不同時間範圍的數據查看 (1個月、3個月、6個月、12個月)
- 高亮顯示最高點和最低點
- 互動式工具提示，顯示每個數據點的詳細信息
- 使用 Cloudflare KV 進行數據緩存，提高性能
- 響應式設計，適應不同屏幕尺寸

## 技術棧

- **前端**:
  - TypeScript
  - D3.js (數據視覺化)
  - HTML5 / CSS3

- **後端**:
  - Cloudflare Workers (無伺服器運行環境)
  - Cloudflare KV (數據緩存)

- **構建工具**:
  - Wrangler CLI (Cloudflare Workers 開發工具)
  - esbuild (JavaScript/TypeScript 打包工具)

## 專案結構

```bash
.
├── index.html                 # 主 HTML 文件 (開發用)
├── package.json               # 專案依賴和腳本
├── public                     # 靜態資源目錄
│   ├── css                    # CSS 樣式文件
│   │   ├── chart.css          # 圖表樣式
│   │   └── style.css          # 全局樣式
│   ├── index.html             # 部署的 HTML 文件
│   └── js                     # 編譯後的 JavaScript 文件
│       ├── chart.js           # 圖表相關功能
│       ├── main.js            # 主應用邏輯
│       └── utils              # 工具函數
│           ├── dataProcessor.js # 數據處理
│           └── formatters.js  # 格式化函數
├── src                        # 源代碼目錄
│   ├── chart.ts               # 圖表創建和互動邏輯
│   ├── index.ts               # Worker 入口文件
│   ├── main.ts                # 主應用邏輯
│   └── utils                  # 工具函數
│       ├── dataProcessor.ts   # 數據處理
│       └── formatters.ts      # 格式化函數
├── test                       # 測試文件
├── tsconfig.json              # TypeScript 配置
├── vitest.config.mts          # Vitest 配置
├── worker-configuration.d.ts  # Worker 類型定義
└── wrangler.jsonc             # Wrangler 配置
```

## 安裝與設置

### 前提條件

- Node.js 18 或更高版本
- npm 或 yarn
- Cloudflare 帳戶

### 安裝步驟

1. Clone repo:

```bash
git clone https://github.com/chihkang/portfolio-tracker.git
cd portfolio-tracker
```

2. 安裝依賴

```bash
npm install
```

3. 創建 Cloudflare KV 命名空間:

```bash
# 登錄到 Cloudflare
npx wrangler login

# 創建 KV 命名空間
npx wrangler kv:namespace create "PORTFOLIO_CACHE"

# 創建預覽 KV 命名空間
npx wrangler kv:namespace create "PORTFOLIO_CACHE" --preview

```

4. 更新 ⁠`wrangler.jsonc` 文件，添加 KV 命名空間 ID:

```json
{
  "kv_namespaces": [
    {
      "binding": "PORTFOLIO_CACHE",
      "id": "your-production-namespace-id",
      "preview_id": "your-preview-namespace-id"
    }
  ]
}
```

## 開發

### **本地開發**

1. 構建客戶端代碼

```bash
npm run build:client
```

2. 啟動開發服務器

```bash
npm run dev
```

3. 訪問 http://localhost:8787 查看應用程式

### **構建與部署**

1. 構建客戶端代碼

```bash
npm run build:client
```

2. 部署到 Cloudflare Workers

```bash
npm run deploy
```

## **API 端點**

`⁠/api/portfolio`

獲取投資組合數據。

**查詢參數:**

​	•	⁠range: 時間範圍 (月數)，可選值: 1, 3, 6, 12。默認為 3。

​	•	⁠refresh: 設置為 "true" 時強制刷新緩存。

**示例:**

```bash
GET /api/portfolio?range=6
```

**響應:**

```json
{
  "portfolioId": "67283d5d447a55a757f87db7",
  "values": [
    {
      "date": "2024-11-26T00:00:00Z",
      "dateStr": "2024-11-26T00:00:00.000Z",
      "dateDay": "2024-11-26",
      "totalValueTwd": 7554091.63843960,
      "changePercent": 0
    },
    // 更多數據點...
  ],
  "summary": {
    "highestValueDate": "2025-02-06T16:00:00.000Z",
    "lowestValueDate": "2024-11-28T00:00:00.000Z",
    "highestValue": 8367269.259818062797920924672,
    "lowestValue": 7519082.2036820,
    "startValue": 7554091.63843960,
    "endValue": 8111458.117893328303294789939,
    "changePercentage": 7.38
  }
}

```

## **數據來源**

應用程式從以下 API 獲取投資組合數據:

```text
https://portfoliomanager-production.up.railway.app/api/PortfolioDailyValue/67283d5d447a55a757f87db7/history
```

## **主要組件**

### **1. Worker (index.ts)**

Cloudflare Worker 處理 HTTP 請求，提供 API 端點，並服務靜態資源。它還實現了數據緩存，以提高性能。

### **2. 數據處理 (dataProcessor.ts)**

處理從 API 獲取的原始數據，計算變化百分比，並確保日期格式正確。

### **3. 圖表生成 (chart.ts)**

使用 D3.js 創建互動式折線圖，顯示投資組合價值隨時間的變化。包括高亮顯示最高點和最低點，以及互動式工具提示。

#### **4. 主應用邏輯 (main.ts)**

初始化應用程式，處理用戶互動，並協調數據獲取和圖表更新。

### **緩存策略**

應用程式使用 Cloudflare KV 存儲來緩存 API 響應，減少對外部 API 的請求數量。緩存項的過期時間設置為 1 小時。

## **故障排除**

### **圖表未顯示**

​	•	檢查瀏覽器控制台是否有錯誤

​	•	確認 API 端點是否可訪問

​	•	清除瀏覽器緩存

### **數據未更新**

​	•	使用 ⁠?refresh=true 參數強制刷新緩存

​	•	檢查 Worker 日誌中的錯誤

​	•	確認 KV 命名空間配置正確