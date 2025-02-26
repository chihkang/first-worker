// src/utils/dataProcessor.ts
function processData(apiData) {
  console.log("Processing data from API...");
  try {
    const values = apiData.values.map((item) => {
      const dateObj = new Date(item.date);
      return {
        date: dateObj,
        dateStr: dateObj.toISOString(),
        dateDay: dateObj.toISOString().split("T")[0],
        totalValueTwd: item.totalValueTwd,
        changePercent: 0
        // Will be calculated below
      };
    });
    values.sort((a, b) => a.date.getTime() - b.date.getTime());
    console.log("Checking for date gaps...");
    for (let i = 1; i < values.length; i++) {
      const currentDate = values[i].date;
      const prevDate = values[i - 1].date;
      const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (1e3 * 60 * 60 * 24);
      if (daysDiff > 1) {
        console.log(`Gap found between ${prevDate.toISOString()} and ${currentDate.toISOString()}: ${daysDiff} days`);
      }
    }
    console.log("Checking for duplicate dates...");
    const dateMap = {};
    values.forEach((item) => {
      const dateKey = item.dateDay;
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = [];
      }
      dateMap[dateKey].push(item);
    });
    Object.keys(dateMap).forEach((dateKey) => {
      if (dateMap[dateKey].length > 1) {
        console.log(
          `Found ${dateMap[dateKey].length} entries for date ${dateKey}:`,
          dateMap[dateKey].map((item) => item.date.toISOString())
        );
      }
    });
    if (values.length > 0) {
      const firstValue = values[0].totalValueTwd;
      values.forEach((item, index) => {
        item.changePercent = index === 0 ? 0 : (item.totalValueTwd - firstValue) / firstValue * 100;
      });
    }
    const summary = {
      highestValueDate: new Date(apiData.summary.highestValueDate),
      lowestValueDate: new Date(apiData.summary.lowestValueDate),
      highestValue: apiData.summary.highestValue,
      lowestValue: apiData.summary.lowestValue,
      startValue: apiData.summary.startValue,
      endValue: apiData.summary.endValue,
      changePercentage: apiData.summary.changePercentage
    };
    console.log("Data processing complete with", values.length, "data points");
    return {
      portfolioId: apiData.portfolioId,
      values,
      summary
    };
  } catch (error) {
    console.error("Error in processData:", error);
    throw error;
  }
}
var dataProcessor = {
  processData
};
export {
  dataProcessor,
  processData
};
