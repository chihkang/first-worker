// src/utils/dataProcessor.ts
function processData(data) {
  console.log("Processing data...");
  try {
    const processed = {
      ...data,
      values: data.values?.map((item) => {
        const dateObj = new Date(item.date);
        return {
          ...item,
          date: dateObj,
          // Add a formatted date string for debugging
          dateStr: dateObj.toISOString(),
          // Add a string containing only the date part, for X-axis grouping
          dateDay: dateObj.toISOString().split("T")[0]
        };
      }) || []
    };
    processed.values.sort((a, b) => a.date.getTime() - b.date.getTime());
    console.log("Checking for date gaps...");
    for (let i = 1; i < processed.values.length; i++) {
      const currentDate = processed.values[i].date;
      const prevDate = processed.values[i - 1].date;
      const daysDiff = (currentDate.getTime() - prevDate.getTime()) / (1e3 * 60 * 60 * 24);
      if (daysDiff > 1) {
        console.log(`Gap found between ${prevDate.toISOString()} and ${currentDate.toISOString()}: ${daysDiff} days`);
      }
    }
    console.log("Checking for duplicate dates...");
    const dateMap = {};
    processed.values.forEach((item) => {
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
    processed.values = processed.values.map((item, index) => ({
      ...item,
      changePercent: index === 0 ? 0 : (item.totalValueTwd - processed.values[0].totalValueTwd) / processed.values[0].totalValueTwd * 100
    }));
    if (processed.summary) {
      processed.summary.highestValueDate = new Date(processed.summary.highestValueDate);
      processed.summary.lowestValueDate = new Date(processed.summary.lowestValueDate);
    }
    console.log("Data processing complete with", processed.values.length, "data points");
    return processed;
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
