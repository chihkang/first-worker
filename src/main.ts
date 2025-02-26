// src/main.ts
import { processData, PortfolioData } from './utils/dataProcessor';
import { formatDate, formatCurrency, formatPercent } from './utils/formatters';
import { createChart, addChartStyles, setupResizeHandler } from './chart';

console.log('main.ts loaded');

/**
 * Loads portfolio data from API
 * @returns Promise resolving to the portfolio data
 */
async function loadPortfolioData(): Promise<PortfolioData> {
    try {
        const response = await fetch('/api/portfolio');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading portfolio data:', error);
        throw error;
    }
}

/**
 * Creates a summary section with key portfolio statistics
 * @param data - The processed portfolio data
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
                <p>${formatDate(new Date(data.summary.highestValueDate))}</p>
            </div>
            <div class="summary-item">
                <h3>最低點</h3>
                <p style="color: #F44336">${formatCurrency(data.summary.lowestValue)}</p>
                <p>${formatDate(new Date(data.summary.lowestValueDate))}</p>
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
 * Initializes the application by loading data and creating chart and summary
 */
export async function initialize(): Promise<void> {
    try {
        console.log('Initializing chart...');
        
        // Add chart styles
        addChartStyles();
        
        // Setup resize handler
        setupResizeHandler();
        
        // Load and process data
        const processedData = await loadPortfolioData();
        
        // Store data in window object for resize events
        (window as any).chartData = processedData;
        
        // Create chart and summary
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

// Export functions for potential testing or reuse
export {
    loadPortfolioData,
    createSummary
};
