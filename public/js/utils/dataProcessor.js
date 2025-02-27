// src/utils/dataProcessor.ts
function daysBetween(date1, date2) {
  return Math.abs(date2.getTime() - date1.getTime()) / (1e3 * 60 * 60 * 24);
}
function validateDate(dateStr, values) {
  try {
    console.log("Validating date:", dateStr);
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.warn("Invalid date detected:", dateStr);
      if (values.length > 0) {
        console.log("Using first date in data range instead:", values[0].date.toISOString());
        return new Date(values[0].date);
      }
      console.warn("No data available, using current date");
      return /* @__PURE__ */ new Date();
    }
    if (values.length > 0) {
      const minDate = values[0].date;
      const maxDate = values[values.length - 1].date;
      if (date < minDate || date > maxDate) {
        console.warn(
          "Date out of range:",
          date.toISOString(),
          "Range:",
          minDate.toISOString(),
          "to",
          maxDate.toISOString()
        );
        const useDate = date < minDate ? minDate : maxDate;
        console.log("Using date within range instead:", useDate.toISOString());
        return new Date(useDate);
      }
    }
    return date;
  } catch (error) {
    console.error("Error validating date:", error);
    return /* @__PURE__ */ new Date();
  }
}
function recalculateExtremePoints(values) {
  if (values.length === 0) {
    return {
      highestValueDate: /* @__PURE__ */ new Date(),
      lowestValueDate: /* @__PURE__ */ new Date(),
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
  console.log("Recalculated highest point:", highestValue, "at", highestValueDate.toISOString());
  console.log("Recalculated lowest point:", lowestValue, "at", lowestValueDate.toISOString());
  return {
    highestValueDate: new Date(highestValueDate),
    lowestValueDate: new Date(lowestValueDate),
    highestValue,
    lowestValue
  };
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
    const extremePoints = recalculateExtremePoints(portfolioValues);
    console.log("API highest value date:", apiData.summary.highestValueDate);
    console.log("API lowest value date:", apiData.summary.lowestValueDate);
    let highestValueDate;
    let lowestValueDate;
    try {
      highestValueDate = validateDate(apiData.summary.highestValueDate, portfolioValues);
      lowestValueDate = validateDate(apiData.summary.lowestValueDate, portfolioValues);
      const highestDateDiff = Math.abs(highestValueDate.getTime() - extremePoints.highestValueDate.getTime()) / (1e3 * 60 * 60 * 24);
      const lowestDateDiff = Math.abs(lowestValueDate.getTime() - extremePoints.lowestValueDate.getTime()) / (1e3 * 60 * 60 * 24);
      console.log("Highest date difference (days):", highestDateDiff);
      console.log("Lowest date difference (days):", lowestDateDiff);
      if (highestDateDiff > 5) {
        console.warn("API highest date differs significantly from calculated date, using calculated date");
        highestValueDate = extremePoints.highestValueDate;
      }
      if (lowestDateDiff > 5) {
        console.warn("API lowest date differs significantly from calculated date, using calculated date");
        lowestValueDate = extremePoints.lowestValueDate;
      }
    } catch (error) {
      console.error("Error validating API dates, using calculated dates instead:", error);
      highestValueDate = extremePoints.highestValueDate;
      lowestValueDate = extremePoints.lowestValueDate;
    }
    const summary = {
      highestValueDate,
      lowestValueDate,
      highestValue: apiData.summary.highestValue,
      lowestValue: apiData.summary.lowestValue,
      startValue: apiData.summary.startValue,
      endValue: apiData.summary.endValue,
      changePercentage: apiData.summary.changePercentage
    };
    console.log("Summary dates after validation:");
    console.log("Highest value date:", summary.highestValueDate.toISOString());
    console.log("Lowest value date:", summary.lowestValueDate.toISOString());
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
