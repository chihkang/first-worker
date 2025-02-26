// src/utils/dataProcessor.ts

// Define interfaces for the data structure
interface DataItem {
    date: Date;
    dateStr: string;
    dateDay: string;
    totalValueTwd: number;
    changePercent: number;
    [key: string]: any; // For any additional properties in the item
  }
  
  interface DataSummary {
    highestValueDate: Date;
    lowestValueDate: Date;
    [key: string]: any; // For any additional properties in the summary
  }
  
  interface PortfolioData {
    values: DataItem[];
    summary?: DataSummary;
    [key: string]: any; // For any additional properties in the data
  }
  
  /**
   * Processes portfolio data by formatting dates, sorting by date,
   * checking for gaps and duplicates, and calculating change percentages.
   * 
   * @param data - The raw portfolio data to process
   * @returns The processed portfolio data
   */
  export function processData(data: Partial<PortfolioData>): PortfolioData {
    console.log('Processing data...');
    try {
      // Ensure dates are Date objects and add date strings for display
      const processed: PortfolioData = {
        ...data,
        values: data.values?.map(item => {
          const dateObj = new Date(item.date);
          return {
            ...item,
            date: dateObj,
            // Add a formatted date string for debugging
            dateStr: dateObj.toISOString(),
            // Add a string containing only the date part, for X-axis grouping
            dateDay: dateObj.toISOString().split('T')[0]
          };
        }) || []
      };
      
      // Ensure dates are sorted chronologically
      processed.values.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Check for date gaps, find possible missing dates
      console.log('Checking for date gaps...');
      for (let i = 1; i < processed.values.length; i++) {
        const currentDate = processed.values[i].date;
        const prevDate = processed.values[i-1].date;
        const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff > 1) {
          console.log(`Gap found between ${prevDate.toISOString()} and ${currentDate.toISOString()}: ${daysDiff} days`);
        }
      }
      
      // Check for duplicate dates (different times on the same day)
      console.log('Checking for duplicate dates...');
      const dateMap: Record<string, DataItem[]> = {};
      processed.values.forEach(item => {
        const dateKey = item.dateDay;
        if (!dateMap[dateKey]) {
          dateMap[dateKey] = [];
        }
        dateMap[dateKey].push(item);
      });
      
      // Output information about duplicate dates
      Object.keys(dateMap).forEach(dateKey => {
        if (dateMap[dateKey].length > 1) {
          console.log(`Found ${dateMap[dateKey].length} entries for date ${dateKey}:`, 
            dateMap[dateKey].map(item => item.date.toISOString()));
        }
      });
      
      // Calculate change rate for each point
      processed.values = processed.values.map((item, index) => ({
        ...item,
        changePercent: index === 0 ? 0 : 
          ((item.totalValueTwd - processed.values[0].totalValueTwd) / 
          processed.values[0].totalValueTwd) * 100
      }));
  
      // Ensure highest and lowest value dates are also Date objects
      if (processed.summary) {
        processed.summary.highestValueDate = new Date(processed.summary.highestValueDate);
        processed.summary.lowestValueDate = new Date(processed.summary.lowestValueDate);
      }
  
      console.log('Data processing complete with', processed.values.length, 'data points');
      return processed;
    } catch (error) {
      console.error('Error in processData:', error);
      throw error;
    }
  }
  
  // Export the function as a named export
  export const dataProcessor = {
    processData
  };
  
  // You can also export the interfaces if they need to be used elsewhere
  export type { PortfolioData, DataItem, DataSummary };
  