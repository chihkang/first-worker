// src/main.ts
import { processData, PortfolioData } from './utils/dataProcessor';
import { formatDate, formatCurrency, formatPercent } from './utils/formatters';
import { createChart, addChartStyles, setupResizeHandler } from './chart';

console.log('main.ts loaded');

// 當前選擇的時間範圍
let currentRange = 3; // 默認為 3 個月

/**
 * 從 API 加載投資組合數據
 * @param range - 時間範圍（月數）
 * @returns Promise resolving to the portfolio data
 */
async function loadPortfolioData(range: number = 3, forceRefresh: boolean = true): Promise<PortfolioData> {
  try {
    console.log(`Fetching portfolio data with range=${range}, forceRefresh=${forceRefresh}`);
    const url = `/api/portfolio?range=${range}${forceRefresh ? '&refresh=true' : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Received data with', data.values.length, 'data points');
    console.log('First date:', new Date(data.values[0].date).toISOString());
    console.log('Last date:', new Date(data.values[data.values.length-1].date).toISOString());
    return data;
  } catch (error) {
    console.error('Error loading portfolio data:', error);
    throw error;
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
  
  summary.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
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
  
  buttons.forEach(button => {
    button.addEventListener('click', async (e) => {
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
  } catch (error) {
    console.error('Error in initialization:', error);
    const chartElement = document.getElementById('chart');
    if (chartElement) {
      chartElement.innerHTML = 
        '<div class="error">圖表載入失敗，請重新整理頁面。</div>';
    }
  }
}

// 導出函數以供潛在的測試或重用
export {
  loadPortfolioData,
  createSummary
};
