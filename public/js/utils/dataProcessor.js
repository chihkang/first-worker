// src/utils/dataProcessor.ts
function daysBetween(date1, date2) {
  return Math.abs(date2.getTime() - date1.getTime()) / (1e3 * 60 * 60 * 24);
}
function processData(apiData) {
  console.log("Processing data from API...");
  try {
    const portfolioValues = apiData.values.map((item) => {
      const dateObj = new Date(item.date);
      const dateIso = dateObj.toISOString();
      return {
        date: dateObj,
        dateStr: dateIso,
        dateDay: dateIso.split("T")[0],
        totalValueTwd: item.totalValueTwd,
        changePercent: 0
        // Will be calculated below
      };
    });
    portfolioValues.sort((a, b) => a.date.getTime() - b.date.getTime());
    console.log("Checking for date gaps...");
    for (let i = 1; i < portfolioValues.length; i++) {
      const currentDate = portfolioValues[i].date;
      const prevDate = portfolioValues[i - 1].date;
      const daysDiff = daysBetween(currentDate, prevDate);
      if (daysDiff > 1) {
        console.log(`Gap found between ${prevDate.toISOString()} and ${currentDate.toISOString()}: ${daysDiff} days`);
      }
    }
    console.log("Checking for duplicate dates...");
    const dateMap = /* @__PURE__ */ new Map();
    portfolioValues.forEach((item) => {
      const dateKey = item.dateDay;
      const items = dateMap.get(dateKey) || [];
      items.push(item);
      dateMap.set(dateKey, items);
    });
    for (const [dateKey, items] of dateMap.entries()) {
      if (items.length > 1) {
        console.log(
          `Found ${items.length} entries for date ${dateKey}:`,
          items.map((item) => item.date.toISOString())
        );
      }
    }
    if (portfolioValues.length > 0) {
      const firstValue = portfolioValues[0].totalValueTwd;
      portfolioValues.forEach((item, index) => {
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
    console.log("Data processing complete with", portfolioValues.length, "data points");
    return {
      portfolioId: apiData.portfolioId,
      values: portfolioValues,
      summary
    };
  } catch (error) {
    console.error("Error in processData:", error instanceof Error ? error.message : String(error));
    throw new Error(`Failed to process portfolio data: ${error instanceof Error ? error.message : String(error)}`);
  }
}
export {
  processData
};
