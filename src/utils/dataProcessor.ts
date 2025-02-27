// src/utils/dataProcessor.ts

// Define interfaces for the API response
interface ApiDataItem {
  date: string;
  totalValueTwd: number;
}

interface ApiSummary {
  highestValue: number;
  highestValueDate: string;
  lowestValue: number;
  lowestValueDate: string;
  startValue: number;
  endValue: number;
  changePercentage: number;
}

interface ApiResponse {
  portfolioId: string;
  values: ApiDataItem[];
  summary: ApiSummary;
}

// Define interfaces for the processed data
interface DataItem {
  date: Date;
  dateStr: string;
  dateDay: string;
  totalValueTwd: number;
  changePercent: number;
  // 移除索引簽名或使用更具體的類型
  [key: string]: string | number | Date;
}

interface DataSummary {
  highestValueDate: Date;
  lowestValueDate: Date;
  highestValue: number;
  lowestValue: number;
  startValue: number;
  endValue: number;
  changePercentage: number;
}

export interface PortfolioData {
  portfolioId: string;
  values: DataItem[];
  summary: DataSummary;
}

// 輔助函數
function daysBetween(date1: Date, date2: Date): number {
  return Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Processes portfolio data from the API
 * @param apiData - The raw API data to process
 * @returns The processed portfolio data
 */
export function processData(apiData: ApiResponse): PortfolioData {
  console.log('Processing data from API...');
  try {
    // Convert API data to our internal format
    const portfolioValues: DataItem[] = apiData.values.map(item => {
      const dateObj = new Date(item.date);
      const dateIso = dateObj.toISOString();
      return {
        date: dateObj,
        dateStr: dateIso,
        dateDay: dateIso.split('T')[0],
        totalValueTwd: item.totalValueTwd,
        changePercent: 0 // Will be calculated below
      };
    });
    
    // Sort values by date
    portfolioValues.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Check for date gaps
    console.log('Checking for date gaps...');
    for (let i = 1; i < portfolioValues.length; i++) {
      const currentDate = portfolioValues[i].date;
      const prevDate = portfolioValues[i-1].date;
      const daysDiff = daysBetween(currentDate, prevDate);
      
      if (daysDiff > 1) {
        console.log(`Gap found between ${prevDate.toISOString()} and ${currentDate.toISOString()}: ${daysDiff} days`);
      }
    }
    
    // Check for duplicate dates using Map
    console.log('Checking for duplicate dates...');
    const dateMap = new Map<string, DataItem[]>();
    
    portfolioValues.forEach(item => {
      const dateKey = item.dateDay;
      const items = dateMap.get(dateKey) || [];
      items.push(item);
      dateMap.set(dateKey, items);
    });
    
    for (const [dateKey, items] of dateMap.entries()) {
      if (items.length > 1) {
        console.log(`Found ${items.length} entries for date ${dateKey}:`, 
          items.map(item => item.date.toISOString()));
      }
    }
    
    // Calculate change percentages
    if (portfolioValues.length > 0) {
      const firstValue = portfolioValues[0].totalValueTwd;
      portfolioValues.forEach((item, index) => {
        item.changePercent = index === 0 ? 0 : 
          ((item.totalValueTwd - firstValue) / firstValue) * 100;
      });
    }
    
    // Process summary data
    const summary: DataSummary = {
      highestValueDate: new Date(apiData.summary.highestValueDate),
      lowestValueDate: new Date(apiData.summary.lowestValueDate),
      highestValue: apiData.summary.highestValue,
      lowestValue: apiData.summary.lowestValue,
      startValue: apiData.summary.startValue,
      endValue: apiData.summary.endValue,
      changePercentage: apiData.summary.changePercentage
    };
    
    console.log('Data processing complete with', portfolioValues.length, 'data points');
    
    return {
      portfolioId: apiData.portfolioId,
      values: portfolioValues,
      summary
    };
  } catch (error) {
    console.error('Error in processData:', error instanceof Error ? error.message : String(error));
    throw new Error(`Failed to process portfolio data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Export the interfaces
export type { DataItem, DataSummary };
