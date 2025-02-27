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
 * 驗證日期字符串並返回有效的 Date 對象
 * @param dateStr - 日期字符串
 * @param values - 數據點數組，用於確定有效範圍
 * @returns 有效的 Date 對象
 */
function validateDate(dateStr: string, values: DataItem[]): Date {
  try {
    console.log('Validating date:', dateStr);
    
    // 嘗試創建日期對象
    const date = new Date(dateStr);
    
    // 檢查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('Invalid date detected:', dateStr);
      
      // 如果日期無效，返回數據範圍內的第一個日期
      if (values.length > 0) {
        console.log('Using first date in data range instead:', values[0].date.toISOString());
        return new Date(values[0].date);
      }
      
      // 如果沒有數據，使用當前日期
      console.warn('No data available, using current date');
      return new Date();
    }
    
    // 檢查日期是否在數據範圍內
    if (values.length > 0) {
      const minDate = values[0].date;
      const maxDate = values[values.length - 1].date;
      
      if (date < minDate || date > maxDate) {
        console.warn('Date out of range:', date.toISOString(), 
          'Range:', minDate.toISOString(), 'to', maxDate.toISOString());
        
        // 如果日期超出範圍，使用範圍內的最接近日期
        const useDate = date < minDate ? minDate : maxDate;
        console.log('Using date within range instead:', useDate.toISOString());
        return new Date(useDate);
      }
    }
    
    return date;
  } catch (error) {
    console.error('Error validating date:', error);
    // 發生錯誤時返回當前日期
    return new Date();
  }
}

/**
 * 重新計算數據中的最高點和最低點
 * @param values - 數據點數組
 * @returns 包含最高點和最低點信息的對象
 */
function recalculateExtremePoints(values: DataItem[]): { 
  highestValueDate: Date, 
  lowestValueDate: Date,
  highestValue: number,
  lowestValue: number
} {
  if (values.length === 0) {
    return {
      highestValueDate: new Date(),
      lowestValueDate: new Date(),
      highestValue: 0,
      lowestValue: 0
    };
  }
  
  let highestValue = values[0].totalValueTwd;
  let lowestValue = values[0].totalValueTwd;
  let highestValueDate = values[0].date;
  let lowestValueDate = values[0].date;
  
  for (const item of values) {
    if (item.totalValueTwd > highestValue) {
      highestValue = item.totalValueTwd;
      highestValueDate = item.date;
    }
    
    if (item.totalValueTwd < lowestValue) {
      lowestValue = item.totalValueTwd;
      lowestValueDate = item.date;
    }
  }
  
  console.log('Recalculated highest point:', highestValue, 'at', highestValueDate.toISOString());
  console.log('Recalculated lowest point:', lowestValue, 'at', lowestValueDate.toISOString());
  
  return {
    highestValueDate: new Date(highestValueDate),
    lowestValueDate: new Date(lowestValueDate),
    highestValue,
    lowestValue
  };
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
    
    // 重新計算最高點和最低點
    const extremePoints = recalculateExtremePoints(portfolioValues);
    
    // 檢查 API 返回的最高點和最低點日期是否有效
    console.log('API highest value date:', apiData.summary.highestValueDate);
    console.log('API lowest value date:', apiData.summary.lowestValueDate);
    
    // 嘗試驗證 API 返回的日期
    let highestValueDate: Date;
    let lowestValueDate: Date;
    
    try {
      highestValueDate = validateDate(apiData.summary.highestValueDate, portfolioValues);
      lowestValueDate = validateDate(apiData.summary.lowestValueDate, portfolioValues);
      
      // 檢查驗證後的日期是否與重新計算的日期相差太大
      const highestDateDiff = Math.abs(highestValueDate.getTime() - extremePoints.highestValueDate.getTime()) / (1000 * 60 * 60 * 24);
      const lowestDateDiff = Math.abs(lowestValueDate.getTime() - extremePoints.lowestValueDate.getTime()) / (1000 * 60 * 60 * 24);
      
      console.log('Highest date difference (days):', highestDateDiff);
      console.log('Lowest date difference (days):', lowestDateDiff);
      
      // 如果差異太大，使用重新計算的日期
      if (highestDateDiff > 5) {
        console.warn('API highest date differs significantly from calculated date, using calculated date');
        highestValueDate = extremePoints.highestValueDate;
      }
      
      if (lowestDateDiff > 5) {
        console.warn('API lowest date differs significantly from calculated date, using calculated date');
        lowestValueDate = extremePoints.lowestValueDate;
      }
    } catch (error) {
      console.error('Error validating API dates, using calculated dates instead:', error);
      highestValueDate = extremePoints.highestValueDate;
      lowestValueDate = extremePoints.lowestValueDate;
    }
    
    // Process summary data
    const summary: DataSummary = {
      highestValueDate: highestValueDate,
      lowestValueDate: lowestValueDate,
      highestValue: apiData.summary.highestValue,
      lowestValue: apiData.summary.lowestValue,
      startValue: apiData.summary.startValue,
      endValue: apiData.summary.endValue,
      changePercentage: apiData.summary.changePercentage
    };
    
    console.log('Summary dates after validation:');
    console.log('Highest value date:', summary.highestValueDate.toISOString());
    console.log('Lowest value date:', summary.lowestValueDate.toISOString());
    
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
