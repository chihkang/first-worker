// src/chart.ts
function logDateInfo(label, date) {
  if (date instanceof Date) {
    console.log(`${label}: ${date.toISOString()} (${date.getTime()})`);
  } else {
    console.log(`${label}: Not a Date object: ${date}`);
  }
}
function formatMillions(value) {
  return (value / 1e6).toFixed(2) + "M";
}
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-TW", {
    month: "2-digit",
    day: "2-digit"
  });
}
function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}
function formatPercent(value) {
  return (value > 0 ? "+" : "") + value.toFixed(2) + "%";
}
function createChart(data) {
  console.log("Creating chart with data:", data);
  console.log("Data points count:", data.values.length);
  d3.select("#chart").selectAll("*").remove();
  if (!data || !data.values || data.values.length === 0) {
    console.error("Invalid data for chart");
    document.getElementById("chart").innerHTML = '<div class="error">\u5716\u8868\u8CC7\u6599\u7121\u6548\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u9801\u9762\u3002</div>';
    return;
  }
  try {
    let makeXGrid2 = function() {
      return d3.axisBottom(x).ticks(d3.timeDay.every(2)).tickSize(-height).tickFormat("");
    }, makeYGrid2 = function() {
      return d3.axisLeft(y).ticks(10).tickSize(-width).tickFormat("");
    };
    var makeXGrid = makeXGrid2, makeYGrid = makeYGrid2;
    if (data.values.length > 0) {
      const firstDate = new Date(data.values[0].date);
      const lastDate = new Date(data.values[data.values.length - 1].date);
      console.log("Date range:", firstDate.toISOString(), "to", lastDate.toISOString());
    }
    data.values.forEach((d) => {
      if (!(d.date instanceof Date)) {
        console.log("Converting date:", d.date);
        d.date = new Date(d.date);
      }
    });
    const minDate = d3.min(data.values, (d) => d.date);
    const maxDate = d3.max(data.values, (d) => d.date);
    console.log("X-axis date range:", minDate, "to", maxDate);
    const margin = { top: 50, right: 50, bottom: 80, left: 60 };
    const container = document.getElementById("chart");
    const containerWidth = container.clientWidth;
    const width = containerWidth - margin.left - margin.right;
    const height = Math.min(500, Math.max(300, containerWidth * 0.5));
    const svg = d3.select("#chart").append("svg").attr("width", "100%").attr("height", height + margin.top + margin.bottom).attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`).attr("preserveAspectRatio", "xMidYMid meet").append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleTime().domain([
      d3.min(data.values, (d) => d.date) || /* @__PURE__ */ new Date(),
      d3.max(data.values, (d) => d.date) || /* @__PURE__ */ new Date()
    ]).range([0, width]);
    console.log("X scale domain:", x.domain());
    const yMin = d3.min(data.values, (d) => d.totalValueTwd) || 0;
    const yMax = d3.max(data.values, (d) => d.totalValueTwd) || 0;
    const yRange = yMax - yMin;
    const y = d3.scaleLinear().domain([
      Math.floor(yMin - yRange * 0.02),
      Math.ceil(yMax + yRange * 0.02)
    ]).range([height, 0]);
    svg.append("g").attr("class", "grid").attr("transform", `translate(0,${height})`).call(makeXGrid2()).style("stroke-opacity", 0.1);
    svg.append("g").attr("class", "grid").call(makeYGrid2()).style("stroke-opacity", 0.1);
    const curveType = d3.curveMonotoneX;
    const area = d3.area().defined((d) => {
      const xPos = x(d.date);
      const yPos = y(d.totalValueTwd);
      return !isNaN(xPos) && !isNaN(yPos);
    }).x((d) => {
      const xPos = x(d.date);
      if (isNaN(xPos)) {
        console.error("Invalid x position for date:", d.date);
        return 0;
      }
      return xPos;
    }).y0(height).y1((d) => {
      const yPos = y(d.totalValueTwd);
      if (isNaN(yPos)) {
        console.error("Invalid y position for value:", d.totalValueTwd);
        return 0;
      }
      return yPos;
    }).curve(curveType);
    const line = d3.line().defined((d) => {
      const xPos = x(d.date);
      const yPos = y(d.totalValueTwd);
      return !isNaN(xPos) && !isNaN(yPos);
    }).x((d) => {
      const xPos = x(d.date);
      if (isNaN(xPos)) {
        console.error("Invalid x position for date:", d.date);
        return 0;
      }
      return xPos;
    }).y((d) => {
      const yPos = y(d.totalValueTwd);
      if (isNaN(yPos)) {
        console.error("Invalid y position for value:", d.totalValueTwd);
        return 0;
      }
      return yPos;
    }).curve(curveType);
    const segment = data.values;
    svg.append("path").datum(segment).attr("class", "area").attr("d", area).style("fill", "rgba(33, 150, 243, 0.1)");
    svg.append("path").datum(segment).attr("class", "line").attr("d", line).style("stroke", "#2196F3").style("stroke-width", width < 500 ? 1.5 : 2).style("fill", "none");
    const dataPointCount = data.values.length;
    let tickInterval;
    if (width < 500) {
      if (dataPointCount <= 30) {
        tickInterval = d3.timeDay.every(5);
      } else if (dataPointCount <= 90) {
        tickInterval = d3.timeDay.every(10);
      } else {
        tickInterval = d3.timeDay.every(20);
      }
    } else {
      if (dataPointCount <= 30) {
        tickInterval = d3.timeDay.every(1);
      } else if (dataPointCount <= 60) {
        tickInterval = d3.timeDay.every(2);
      } else if (dataPointCount <= 90) {
        tickInterval = d3.timeDay.every(3);
      } else if (dataPointCount <= 180) {
        tickInterval = d3.timeDay.every(7);
      } else {
        tickInterval = d3.timeDay.every(14);
      }
    }
    console.log("Using tick interval based on", dataPointCount, "data points");
    const xAxis = d3.axisBottom(x).ticks(tickInterval).tickFormat(d3.timeFormat("%m/%d"));
    svg.append("g").attr("class", "x axis").attr("transform", `translate(0,${height})`).call(xAxis).selectAll("text").style("text-anchor", "end").attr("dx", "-.8em").attr("dy", ".15em").attr("transform", function() {
      return width < 500 ? "rotate(-90)" : "rotate(-45)";
    }).style("font-size", width < 500 ? "9px" : "12px");
    const yTickCount = Math.max(3, Math.floor(height / 50));
    const yAxis = d3.axisLeft(y).ticks(yTickCount).tickFormat((value) => (value / 1e6).toFixed(1) + "M");
    svg.append("g").attr("class", "y axis").call(yAxis).selectAll("text").style("font-size", width < 500 ? "9px" : "12px");
    if (width >= 400) {
      svg.append("text").attr("class", "axis-label").attr("x", width / 2).attr("y", height + margin.bottom - 10).style("text-anchor", "middle").style("font-size", width < 600 ? "10px" : "12px").text("\u65E5\u671F (2025\u5E74)");
      svg.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("y", -margin.left + 20).attr("x", -(height / 2)).style("text-anchor", "middle").style("font-size", width < 600 ? "10px" : "12px").text("\u7E3D\u8CC7\u7522\u50F9\u503C (TWD)");
    }
    const pointSize = width < 500 ? 3 : 4;
    const points = svg.selectAll(".data-point").data(segment).enter().append("circle").attr("class", "data-point").attr("cx", (d) => x(d.date)).attr("cy", (d) => y(d.totalValueTwd)).attr("r", pointSize).style("fill", "#2196F3").style("stroke", "white").style("stroke-width", width < 500 ? 1 : 2);
    d3.selectAll(".chart-tooltip").remove();
    const tooltip = d3.select("body").append("div").attr("class", "chart-tooltip tooltip").style("opacity", 0).style("position", "absolute").style("background-color", "rgba(0, 0, 0, 0.8)").style("color", "white").style("padding", width < 500 ? "8px" : "10px").style("border-radius", "5px").style("pointer-events", "none").style("font-size", width < 500 ? "10px" : "12px").style("z-index", "1000").style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)").style("max-width", width < 500 ? "150px" : "180px").style("min-width", width < 500 ? "120px" : "150px");
    points.on("mouseover", function(event, d) {
      d3.select(this).attr("r", width < 500 ? 6 : 8).style("fill", "#FF4081");
      const formattedDate = d.date instanceof Date ? d.date.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }) : formatDate(d.date);
      const formattedValue = formatCurrency(d.totalValueTwd);
      const formattedChange = d.changePercent !== void 0 ? formatPercent(d.changePercent) : "N/A";
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`
        <div style="margin-bottom: 5px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 5px;">
          ${formattedDate}
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span>\u7E3D\u503C:</span>
          <span style="font-weight: bold;">${formattedValue}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>\u8B8A\u5316:</span>
          <span style="font-weight: bold; color: ${d.changePercent >= 0 ? "#4CAF50" : "#F44336"}">
            ${formattedChange}
          </span>
        </div>
      `);
      const tooltipWidth = width < 500 ? 150 : 180;
      const tooltipHeight = width < 500 ? 80 : 100;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      let tooltipX = event.pageX + 15;
      let tooltipY = event.pageY - 15;
      if (tooltipX + tooltipWidth > windowWidth) {
        tooltipX = event.pageX - tooltipWidth - 15;
      }
      if (tooltipY + tooltipHeight > windowHeight) {
        tooltipY = event.pageY - tooltipHeight - 15;
      }
      tooltip.style("left", tooltipX + "px").style("top", tooltipY + "px");
    }).on("mouseout", function() {
      d3.select(this).attr("r", pointSize).style("fill", "#2196F3");
      tooltip.transition().duration(300).style("opacity", 0);
    });
    console.log("Chart data summary:", data.summary);
    console.log("Highest point date:", data.summary.highestValueDate);
    console.log("Lowest point date:", data.summary.lowestValueDate);
    console.log("X domain:", x.domain());
    const highestPoint = {
      date: new Date(data.summary.highestValueDate),
      totalValueTwd: data.summary.highestValue
    };
    const lowestPoint = {
      date: new Date(data.summary.lowestValueDate),
      totalValueTwd: data.summary.lowestValue
    };
    console.log("Highest point for drawing:", highestPoint);
    console.log("Lowest point for drawing:", lowestPoint);
    console.log("X position for highest point:", x(highestPoint.date));
    console.log("X position for lowest point:", x(lowestPoint.date));
    console.log("Y position for highest point:", y(highestPoint.totalValueTwd));
    console.log("Y position for lowest point:", y(lowestPoint.totalValueTwd));
    if (isNaN(x(highestPoint.date)) || isNaN(y(highestPoint.totalValueTwd))) {
      console.error("Invalid position for highest point");
      let maxValue = -Infinity;
      let maxValuePoint = null;
      for (const point of data.values) {
        if (point.totalValueTwd > maxValue) {
          maxValue = point.totalValueTwd;
          maxValuePoint = point;
        }
      }
      if (maxValuePoint) {
        console.log("Using calculated highest point from data:", maxValuePoint);
        highestPoint.date = maxValuePoint.date;
        highestPoint.totalValueTwd = maxValuePoint.totalValueTwd;
      }
    }
    if (isNaN(x(lowestPoint.date)) || isNaN(y(lowestPoint.totalValueTwd))) {
      console.error("Invalid position for lowest point");
      let minValue = Infinity;
      let minValuePoint = null;
      for (const point of data.values) {
        if (point.totalValueTwd < minValue) {
          minValue = point.totalValueTwd;
          minValuePoint = point;
        }
      }
      if (minValuePoint) {
        console.log("Using calculated lowest point from data:", minValuePoint);
        lowestPoint.date = minValuePoint.date;
        lowestPoint.totalValueTwd = minValuePoint.totalValueTwd;
      }
    }
    console.log("Final X position for highest point:", x(highestPoint.date));
    console.log("Final X position for lowest point:", x(lowestPoint.date));
    if (!isNaN(x(highestPoint.date)) && !isNaN(y(highestPoint.totalValueTwd))) {
      svg.append("circle").attr("class", "highlight-point").attr("cx", x(highestPoint.date)).attr("cy", y(highestPoint.totalValueTwd)).attr("r", width < 500 ? 5 : 6).style("fill", "#4CAF50").style("stroke", "white").style("stroke-width", width < 500 ? 1 : 2);
      if (width >= 500) {
        svg.append("text").attr("class", "point-label").attr("x", x(highestPoint.date)).attr("y", y(highestPoint.totalValueTwd) - 15).attr("text-anchor", "middle").style("fill", "#4CAF50").style("font-size", width < 600 ? "10px" : "12px").text(formatMillions(highestPoint.totalValueTwd));
      }
    }
    if (!isNaN(x(lowestPoint.date)) && !isNaN(y(lowestPoint.totalValueTwd))) {
      svg.append("circle").attr("class", "highlight-point").attr("cx", x(lowestPoint.date)).attr("cy", y(lowestPoint.totalValueTwd)).attr("r", width < 500 ? 5 : 6).style("fill", "#F44336").style("stroke", "white").style("stroke-width", width < 500 ? 1 : 2);
      if (width >= 500) {
        svg.append("text").attr("class", "point-label").attr("x", x(lowestPoint.date)).attr("y", y(lowestPoint.totalValueTwd) + 25).attr("text-anchor", "middle").style("fill", "#F44336").style("font-size", width < 600 ? "10px" : "12px").text(formatMillions(lowestPoint.totalValueTwd));
      }
    }
    const legendX = width < 500 ? width - 70 : width - 100;
    const legendFontSize = width < 500 ? "10px" : "12px";
    const legend = svg.append("g").attr("class", "legend").attr("transform", `translate(${legendX}, 0)`);
    legend.append("circle").attr("r", width < 500 ? 5 : 6).attr("cx", 0).attr("cy", 0).style("fill", "#4CAF50");
    legend.append("text").attr("x", 10).attr("y", 4).style("font-size", legendFontSize).text("\u6700\u9AD8\u9EDE");
    legend.append("circle").attr("r", width < 500 ? 5 : 6).attr("cx", 0).attr("cy", 20).style("fill", "#F44336");
    legend.append("text").attr("x", 10).attr("y", 24).style("font-size", legendFontSize).text("\u6700\u4F4E\u9EDE");
  } catch (error) {
    console.error("Error in createChart:", error);
    document.getElementById("chart").innerHTML = '<div class="error">\u5716\u8868\u8F09\u5165\u5931\u6557\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u9801\u9762\u3002</div>';
    setTimeout(() => {
      if (window.chartData) {
        console.log("Retrying chart creation...");
        createChart(window.chartData);
      }
    }, 1e3);
  }
}
function addChartStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .line {
      fill: none;
      stroke: #2196F3;
      stroke-width: 2;
    }
    .area {
      fill: rgba(33, 150, 243, 0.1);
    }
    .grid line {
      stroke: #ddd;
      stroke-opacity: 0.1;
    }
    .chart-tooltip {
      position: absolute;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      pointer-events: none;
      font-size: 12px;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      min-width: 150px;
    }
    .axis-label {
      font-size: 12px;
      font-weight: bold;
    }
    .point-label {
      font-size: 12px;
      font-weight: bold;
    }
    .data-point {
      transition: r 0.2s ease, fill 0.2s ease;
    }
    .highlight-point {
      transition: r 0.2s ease, fill 0.2s ease;
    }
    
    /* \u97FF\u61C9\u5F0F\u6A23\u5F0F */
    @media (max-width: 768px) {
      .line {
        stroke-width: 1.5;
      }
      
      .axis-label {
        font-size: 10px;
      }
      
      .point-label {
        font-size: 10px;
      }
      
      .tooltip {
        padding: 8px;
        font-size: 10px;
        max-width: 150px;
        min-width: 120px;
      }
    }
    
    @media (max-width: 480px) {
      .line {
        stroke-width: 1.5;
      }
      
      .axis text {
        font-size: 9px;
      }
      
      .axis-label {
        font-size: 9px;
      }
      
      .point-label {
        font-size: 9px;
      }
      
      .data-point, .highlight-point {
        transition: none; /* \u5728\u5C0F\u87A2\u5E55\u4E0A\u7981\u7528\u904E\u6E21\u6548\u679C\u4EE5\u63D0\u9AD8\u6027\u80FD */
      }
    }
    
    .error {
      color: #F44336;
      padding: 20px;
      text-align: center;
      font-size: 16px;
      background-color: #FFEBEE;
      border-radius: 4px;
      margin: 20px 0;
    }
  `;
  document.head.appendChild(style);
}
function setupResizeHandler() {
  let resizeTimeout = null;
  function resizeChart() {
    if (window.chartData) {
      createChart(window.chartData);
    }
  }
  window.addEventListener("resize", function() {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(resizeChart, 250);
  });
}
var chart_default = {
  createChart,
  addChartStyles,
  setupResizeHandler,
  formatMillions,
  formatDate,
  formatCurrency,
  formatPercent
};
export {
  addChartStyles,
  createChart,
  chart_default as default,
  formatCurrency,
  formatDate,
  formatMillions,
  formatPercent,
  logDateInfo,
  setupResizeHandler
};
