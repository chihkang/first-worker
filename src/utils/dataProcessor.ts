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
  [key: string]: any;
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

/**
 * Processes portfolio data from the API
 * @param apiData - The raw API data to process
 * @returns The processed portfolio data
 */
export function processData(apiData: ApiResponse): PortfolioData {
  console.log('Processing data from API...');
  try {
    // Convert API data to our internal format
    const values: DataItem[] = apiData.values.map(item => {
      const dateObj = new Date(item.date);
      return {
        date: dateObj,
        dateStr: dateObj.toISOString(),
        dateDay: dateObj.toISOString().split('T')[0],
        totalValueTwd: item.totalValueTwd,
        changePercent: 0 // Will be calculated below
      };
    });
    
    // Sort values by date
    values.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Check for date gaps
    console.log('Checking for date gaps...');
    for (let i = 1; i < values.length; i++) {
      const currentDate = values[i].date;
      const prevDate = values[i-1].date;
      const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 1) {
        console.log(`Gap found between ${prevDate.toISOString()} and ${currentDate.toISOString()}: ${daysDiff} days`);
      }
    }
    
    // Check for duplicate dates
    console.log('Checking for duplicate dates...');
    const dateMap: Record<string, DataItem[]> = {};
    values.forEach(item => {
      const dateKey = item.dateDay;
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = [];
      }
      dateMap[dateKey].push(item);
    });
    
    Object.keys(dateMap).forEach(dateKey => {
      if (dateMap[dateKey].length > 1) {
        console.log(`Found ${dateMap[dateKey].length} entries for date ${dateKey}:`, 
          dateMap[dateKey].map(item => item.date.toISOString()));
      }
    });
    
    // Calculate change percentages
    if (values.length > 0) {
      const firstValue = values[0].totalValueTwd;
      values.forEach((item, index) => {
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
    
    console.log('Data processing complete with', values.length, 'data points');
    
    return {
      portfolioId: apiData.portfolioId,
      values,
      summary
    };
  } catch (error) {
    console.error('Error in processData:', error);
    throw error;
  }
}

// Export the function as a named export
export const dataProcessor = {
  processData
};

// Export the interfaces
export type { DataItem, DataSummary };
