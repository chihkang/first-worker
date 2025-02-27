// src/main.ts
import { processData, PortfolioData } from './utils/dataProcessor';
import { formatDate, formatCurrency, formatPercent } from './utils/formatters';
import { createChart, addChartStyles, setupResizeHandler } from './chart';

console.log('main.ts loaded');

// 當前選擇的時間範圍
let currentRange = 3; // 默認為 3 個月
let isLoading = false; // 追蹤數據加載狀態

/**
 * 從 API 加載投資組合數據
 * @param range - 時間範圍（月數）
 * @returns Promise resolving to the portfolio data
 */
async function loadPortfolioData(range: number = 3, forceRefresh: boolean = true): Promise<PortfolioData> {
  try {
    if (isLoading) {
      console.log('Already loading data, request ignored');
      throw new Error('Already loading data');
    }
    
    isLoading = true;
    showLoadingIndicator();
    
    console.log(`Fetching portfolio data with range=${range}, forceRefresh=${forceRefresh}`);
    const url = `/api/portfolio?range=${range}${forceRefresh ? '&refresh=true' : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Received data with', data.values.length, 'data points');
    
    if (data.values.length === 0) {
      throw new Error('No data points received');
    }
    
    console.log('First date:', new Date(data.values[0].date).toISOString());
    console.log('Last date:', new Date(data.values[data.values.length-1].date).toISOString());
    
    // 確保所有日期都是 Date 對象
    data.values.forEach(d => {
      if (!(d.date instanceof Date)) {
        d.date = new Date(d.date);
      }
    });
    
    hideLoadingIndicator();
    isLoading = false;
    return data;
  } catch (error) {
    console.error('Error loading portfolio data:', error);
    hideLoadingIndicator();
    isLoading = false;
    
    // 顯示錯誤訊息
    const chartElement = document.getElementById('chart');
    if (chartElement) {
      chartElement.innerHTML = 
        `<div class="error">數據載入失敗: ${error.message}。請重新整理頁面。</div>`;
    }
    
    throw error;
  }
}

/**
 * 顯示加載指示器
 */
function showLoadingIndicator(): void {
  const chartElement = document.getElementById('chart');
  if (chartElement) {
    // 保存當前內容
    if (!chartElement.getAttribute('data-original-content')) {
      chartElement.setAttribute('data-original-content', chartElement.innerHTML);
    }
    
    // 添加加載指示器
    chartElement.innerHTML = `
      <div class="loading-indicator">
        <div class="spinner"></div>
        <p>載入中...</p>
      </div>
    `;
  }
  
  // 添加加載指示器樣式
  if (!document.getElementById('loading-styles')) {
    const style = document.createElement('style');
    style.id = 'loading-styles';
    style.textContent = `
      .loading-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        color: #666;
      }
      
      .spinner {
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        border-top: 4px solid #2196F3;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin-bottom: 15px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * 隱藏加載指示器
 */
function hideLoadingIndicator(): void {
  const chartElement = document.getElementById('chart');
  if (chartElement) {
    // 恢復原始內容
    const originalContent = chartElement.getAttribute('data-original-content');
    if (originalContent && chartElement.querySelector('.loading-indicator')) {
      chartElement.innerHTML = originalContent;
      chartElement.removeAttribute('data-original-content');
    }
  }
}

/**
 * 創建摘要部分，顯示關鍵投資組合統計數據
 * @param data - 處理後的投資組合數據
 */
function createSummary(data: PortfolioData): void {
  const summary = document.getElementById('summary');
  if (!summary) {
    console.error('Summary element not found');
    return;
  }
  
  const startDate = formatDate(data.values[0].date);
  const endDate = formatDate(data.values[data.values.length - 1].date);
  const totalChange = data.summary.endValue - data.summary.startValue;
  
  // 使用響應式網格佈局
  summary.innerHTML = `
    <div class="summary-grid">
      <div class="summary-item">
        <h3>觀察期間</h3>
        <p>${startDate} ~ ${endDate}</p>
      </div>
      <div class="summary-item">
        <h3>最高點</h3>
        <p style="color: #4CAF50">${formatCurrency(data.summary.highestValue)}</p>
        <p>${formatDate(data.summary.highestValueDate)}</p>
      </div>
      <div class="summary-item">
        <h3>最低點</h3>
        <p style="color: #F44336">${formatCurrency(data.summary.lowestValue)}</p>
        <p>${formatDate(data.summary.lowestValueDate)}</p>
      </div>
      <div class="summary-item">
        <h3>總變化</h3>
        <p style="color: ${totalChange >= 0 ? '#4CAF50' : '#F44336'}">
          ${formatCurrency(totalChange)} (${formatPercent(data.summary.changePercentage)})
        </p>
      </div>
    </div>
  `;
  
  // 添加響應式摘要樣式
  if (!document.getElementById('summary-styles')) {
    const style = document.createElement('style');
    style.id = 'summary-styles';
    style.textContent = `
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
      }
      
      @media (max-width: 600px) {
        .summary-grid {
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 10px;
        }
        
        .summary-item h3 {
          font-size: 12px;
        }
        
        .summary-item p {
          font-size: 14px;
        }
      }
      
      @media (max-width: 400px) {
        .summary-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * 設置範圍選擇按鈕的事件監聽器
 */
function setupRangeButtons(): void {
  console.log('Setting up range buttons');
  const buttons = document.querySelectorAll('.range-btn');
  
  if (buttons.length === 0) {
    console.error('No range buttons found!');
    return;
  }
  
  console.log('Found', buttons.length, 'range buttons');
  
  // 添加響應式按鈕樣式
  if (!document.getElementById('range-button-styles')) {
    const style = document.createElement('style');
    style.id = 'range-button-styles';
    style.textContent = `
      .range-selector {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 5px;
        margin: 15px 0;
      }
      
      @media (max-width: 600px) {
        .range-selector {
          gap: 3px;
        }
        
        .range-btn {
          padding: 6px 10px;
          font-size: 12px;
        }
      }
      
      @media (max-width: 400px) {
        .range-selector span {
          display: block;
          width: 100%;
          text-align: center;
          margin-bottom: 5px;
        }
        
        .range-btn {
          flex: 1;
          padding: 5px 8px;
          font-size: 11px;
          min-width: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  buttons.forEach(button => {
    button.addEventListener('click', async (e) => {
      // 如果正在加載數據，忽略點擊
      if (isLoading) {
        console.log('Loading in progress, button click ignored');
        return;
      }
      
      const target = e.currentTarget as HTMLElement;
      const range = parseInt(target.getAttribute('data-range') || '3');
      
      console.log('Button clicked, range:', range);
      
      // 更新當前範圍
      currentRange = range;
      
      // 更新按鈕樣式
      buttons.forEach(btn => btn.classList.remove('active'));
      target.classList.add('active');
      
      // 重新加載數據並更新圖表 - 使用強制刷新
      try {
        console.log('Loading data for range:', range);
        const data = await loadPortfolioData(range, true);
        console.log('Data loaded, updating chart and summary');
        
        (window as any).chartData = data;
        createChart(data);
        createSummary(data);
      } catch (error) {
        console.error('Error updating chart:', error);
        // 錯誤處理已在 loadPortfolioData 中完成
      }
    });
  });
  
  // 默認選中 3 個月按鈕
  const defaultButton = document.querySelector('.range-btn[data-range="3"]');
  if (defaultButton) {
    defaultButton.classList.add('active');
  }
}

/**
 * 初始化應用程序，加載數據並創建圖表和摘要
 */
export async function initialize(): Promise<void> {
  try {
    console.log('Initializing chart...');
    
    // 添加圖表樣式
    addChartStyles();
    
    // 設置調整大小處理程序
    setupResizeHandler();
    
    // 設置範圍按鈕
    setupRangeButtons();
    
    // 加載數據
    console.log('Loading initial data with range:', currentRange);
    const processedData = await loadPortfolioData(currentRange);
    
    // 將數據存儲在 window 對象中，用於調整大小事件
    (window as any).chartData = processedData;
    
    // 創建圖表和摘要
    createChart(processedData);
    createSummary(processedData);
    
    // 添加錯誤恢復機制
    window.addEventListener('error', function(e) {
      console.error('Global error caught:', e.error);
      if (e.error && e.error.message && e.error.message.includes('chart')) {
        const chartElement = document.getElementById('chart');
        if (chartElement) {
          chartElement.innerHTML = 
            '<div class="error">圖表發生錯誤，請重新整理頁面。</div>';
          
          // 添加重試按鈕
          const retryButton = document.createElement('button');
          retryButton.textContent = '重試';
          retryButton.className = 'retry-button';
          retryButton.style.cssText = 'margin-top: 15px; padding: 8px 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;';
          retryButton.onclick = async () => {
            try {
              const data = await loadPortfolioData(currentRange, true);
              (window as any).chartData = data;
              createChart(data);
              createSummary(data);
            } catch (err) {
              console.error('Retry failed:', err);
            }
          };
          
          chartElement.querySelector('.error')?.appendChild(retryButton);
        }
      }
    });
    
  } catch (error) {
    console.error('Error in initialization:', error);
    const chartElement = document.getElementById('chart');
    if (chartElement) {
      chartElement.innerHTML = 
        '<div class="error">圖表載入失敗，請重新整理頁面。</div>';
      
      // 添加重試按鈕
      const retryButton = document.createElement('button');
      retryButton.textContent = '重試';
      retryButton.className = 'retry-button';
      retryButton.style.cssText = 'margin-top: 15px; padding: 8px 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;';
      retryButton.onclick = initialize;
      
      chartElement.querySelector('.error')?.appendChild(retryButton);
    }
  }
}

// 導出函數以供潛在的測試或重用
export {
  loadPortfolioData,
  createSummary
};
