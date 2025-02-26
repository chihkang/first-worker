// src/utils/formatters.ts
function formatDate(date) {
  return new Date(date).toLocaleDateString("zh-TW");
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
  return new Intl.NumberFormat("zh-TW", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
}

// src/chart.ts
function formatMillions(value) {
  return (value / 1e6).toFixed(2) + "M";
}
function formatDate2(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-TW", {
    month: "2-digit",
    day: "2-digit"
  });
}
function formatCurrency2(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}
function formatPercent2(value) {
  return (value > 0 ? "+" : "") + value.toFixed(2) + "%";
}
function createChart(data) {
  console.log("Creating chart with data:", data);
  console.log("Data points count:", data.values.length);
  if (data.values.length > 0) {
    const firstDate = new Date(data.values[0].date);
    const lastDate = new Date(data.values[data.values.length - 1].date);
    console.log("Date range:", firstDate.toISOString(), "to", lastDate.toISOString());
  }
  try {
    let makeXGrid2 = function() {
      return d3.axisBottom(x).ticks(d3.timeDay.every(2)).tickSize(-height).tickFormat("");
    }, makeYGrid2 = function() {
      return d3.axisLeft(y).ticks(10).tickSize(-width).tickFormat("");
    };
    var makeXGrid = makeXGrid2, makeYGrid = makeYGrid2;
    data.values.forEach((d) => {
      if (!(d.date instanceof Date)) {
        console.log("Converting date:", d.date);
        d.date = new Date(d.date);
      }
    });
    d3.select("#chart").selectAll("*").remove();
    const minDate = d3.min(data.values, (d) => d.date);
    const maxDate = d3.max(data.values, (d) => d.date);
    console.log("X-axis date range:", minDate, "to", maxDate);
    const margin = { top: 50, right: 120, bottom: 80, left: 100 };
    const width = Math.max(800, window.innerWidth - margin.left - margin.right - 40);
    const height = 500;
    const svg = d3.select("#chart").append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleTime().domain([
      minDate || /* @__PURE__ */ new Date(),
      maxDate || /* @__PURE__ */ new Date()
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
    svg.append("path").datum(segment).attr("class", "line").attr("d", line).style("stroke", "#2196F3").style("stroke-width", 2).style("fill", "none");
    let tickInterval = d3.timeDay.every(2);
    const dataPointCount = data.values.length;
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
    console.log("Using tick interval based on", dataPointCount, "data points");
    const xAxis = d3.axisBottom(x).ticks(tickInterval).tickFormat(d3.timeFormat("%m/%d"));
    svg.append("g").attr("class", "x axis").attr("transform", `translate(0,${height})`).call(xAxis).selectAll("text").style("text-anchor", "end").attr("dx", "-.8em").attr("dy", ".15em").attr("transform", "rotate(-45)");
    const yAxis = d3.axisLeft(y).ticks(10).tickFormat((value) => (value / 1e6).toFixed(2) + "M");
    svg.append("g").attr("class", "y axis").call(yAxis);
    svg.append("text").attr("class", "axis-label").attr("x", width / 2).attr("y", height + margin.bottom - 10).style("text-anchor", "middle").text("\u65E5\u671F (2025\u5E74)");
    svg.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("y", -margin.left + 20).attr("x", -(height / 2)).style("text-anchor", "middle").text("\u7E3D\u8CC7\u7522\u50F9\u503C (TWD)");
    const points = svg.selectAll(".data-point").data(segment).enter().append("circle").attr("class", "data-point").attr("cx", (d) => x(d.date)).attr("cy", (d) => y(d.totalValueTwd)).attr("r", 4).style("fill", "#2196F3").style("stroke", "white").style("stroke-width", 2);
    d3.selectAll(".chart-tooltip").remove();
    const tooltip = d3.select("body").append("div").attr("class", "chart-tooltip tooltip").style("opacity", 0).style("position", "absolute").style("background-color", "rgba(0, 0, 0, 0.8)").style("color", "white").style("padding", "10px").style("border-radius", "5px").style("pointer-events", "none").style("font-size", "12px").style("z-index", "1000").style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)");
    points.on("mouseover", function(event, d) {
      d3.select(this).attr("r", 8).style("fill", "#FF4081");
      const formattedDate = d.date instanceof Date ? d.date.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }) : formatDate2(d.date);
      const formattedValue = formatCurrency2(d.totalValueTwd);
      const formattedChange = d.changePercent !== void 0 ? formatPercent2(d.changePercent) : "N/A";
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
      const tooltipWidth = 180;
      const tooltipHeight = 100;
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
      d3.select(this).attr("r", 4).style("fill", "#2196F3");
      tooltip.transition().duration(300).style("opacity", 0);
    });
    const highestPoint = {
      date: data.summary.highestValueDate,
      totalValueTwd: data.summary.highestValue
    };
    const lowestPoint = {
      date: data.summary.lowestValueDate,
      totalValueTwd: data.summary.lowestValue
    };
    svg.append("circle").attr("class", "highlight-point").attr("cx", x(highestPoint.date)).attr("cy", y(highestPoint.totalValueTwd)).attr("r", 6).style("fill", "#4CAF50").style("stroke", "white").style("stroke-width", 2);
    svg.append("text").attr("class", "point-label").attr("x", x(highestPoint.date)).attr("y", y(highestPoint.totalValueTwd) - 15).attr("text-anchor", "middle").style("fill", "#4CAF50").text(formatMillions(highestPoint.totalValueTwd));
    svg.append("circle").attr("class", "highlight-point").attr("cx", x(lowestPoint.date)).attr("cy", y(lowestPoint.totalValueTwd)).attr("r", 6).style("fill", "#F44336").style("stroke", "white").style("stroke-width", 2);
    svg.append("text").attr("class", "point-label").attr("x", x(lowestPoint.date)).attr("y", y(lowestPoint.totalValueTwd) + 25).attr("text-anchor", "middle").style("fill", "#F44336").text(formatMillions(lowestPoint.totalValueTwd));
    const legend = svg.append("g").attr("class", "legend").attr("transform", `translate(${width - 100}, 0)`);
    legend.append("circle").attr("r", 6).attr("cx", 0).attr("cy", 0).style("fill", "#4CAF50");
    legend.append("text").attr("x", 10).attr("y", 4).text("\u6700\u9AD8\u9EDE");
    legend.append("circle").attr("r", 6).attr("cx", 0).attr("cy", 20).style("fill", "#F44336");
    legend.append("text").attr("x", 10).attr("y", 24).text("\u6700\u4F4E\u9EDE");
  } catch (error) {
    console.error("Error in createChart:", error);
    throw error;
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
  `;
  document.head.appendChild(style);
}
function setupResizeHandler() {
  function resizeChart() {
    const margin = { top: 50, right: 120, bottom: 80, left: 100 };
    const newWidth = Math.max(800, window.innerWidth - margin.left - margin.right - 40);
    if (window.chartData) {
      createChart(window.chartData);
    }
  }
  window.addEventListener("resize", _.debounce(resizeChart, 250));
}

// src/main.ts
console.log("main.ts loaded");
var currentRange = 3;
async function loadPortfolioData(range = 3, forceRefresh = true) {
  try {
    console.log(`Fetching portfolio data with range=${range}, forceRefresh=${forceRefresh}`);
    const url = `/api/portfolio?range=${range}${forceRefresh ? "&refresh=true" : ""}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Received data with", data.values.length, "data points");
    console.log("First date:", new Date(data.values[0].date).toISOString());
    console.log("Last date:", new Date(data.values[data.values.length - 1].date).toISOString());
    return data;
  } catch (error) {
    console.error("Error loading portfolio data:", error);
    throw error;
  }
}
function createSummary(data) {
  const summary = document.getElementById("summary");
  if (!summary) {
    console.error("Summary element not found");
    return;
  }
  const startDate = formatDate(data.values[0].date);
  const endDate = formatDate(data.values[data.values.length - 1].date);
  const totalChange = data.summary.endValue - data.summary.startValue;
  summary.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
      <div class="summary-item">
        <h3>\u89C0\u5BDF\u671F\u9593</h3>
        <p>${startDate} ~ ${endDate}</p>
      </div>
      <div class="summary-item">
        <h3>\u6700\u9AD8\u9EDE</h3>
        <p style="color: #4CAF50">${formatCurrency(data.summary.highestValue)}</p>
        <p>${formatDate(data.summary.highestValueDate)}</p>
      </div>
      <div class="summary-item">
        <h3>\u6700\u4F4E\u9EDE</h3>
        <p style="color: #F44336">${formatCurrency(data.summary.lowestValue)}</p>
        <p>${formatDate(data.summary.lowestValueDate)}</p>
      </div>
      <div class="summary-item">
        <h3>\u7E3D\u8B8A\u5316</h3>
        <p style="color: ${totalChange >= 0 ? "#4CAF50" : "#F44336"}">
          ${formatCurrency(totalChange)} (${formatPercent(data.summary.changePercentage)})
        </p>
      </div>
    </div>
  `;
}
function setupRangeButtons() {
  console.log("Setting up range buttons");
  const buttons = document.querySelectorAll(".range-btn");
  if (buttons.length === 0) {
    console.error("No range buttons found!");
    return;
  }
  console.log("Found", buttons.length, "range buttons");
  buttons.forEach((button) => {
    button.addEventListener("click", async (e) => {
      const target = e.currentTarget;
      const range = parseInt(target.getAttribute("data-range") || "3");
      console.log("Button clicked, range:", range);
      currentRange = range;
      buttons.forEach((btn) => btn.classList.remove("active"));
      target.classList.add("active");
      try {
        console.log("Loading data for range:", range);
        const data = await loadPortfolioData(range, true);
        console.log("Data loaded, updating chart and summary");
        window.chartData = data;
        createChart(data);
        createSummary(data);
      } catch (error) {
        console.error("Error updating chart:", error);
      }
    });
  });
  const defaultButton = document.querySelector('.range-btn[data-range="3"]');
  if (defaultButton) {
    defaultButton.classList.add("active");
  }
}
async function initialize() {
  try {
    console.log("Initializing chart...");
    addChartStyles();
    setupResizeHandler();
    setupRangeButtons();
    console.log("Loading initial data with range:", currentRange);
    const processedData = await loadPortfolioData(currentRange);
    window.chartData = processedData;
    createChart(processedData);
    createSummary(processedData);
  } catch (error) {
    console.error("Error in initialization:", error);
    const chartElement = document.getElementById("chart");
    if (chartElement) {
      chartElement.innerHTML = '<div class="error">\u5716\u8868\u8F09\u5165\u5931\u6557\uFF0C\u8ACB\u91CD\u65B0\u6574\u7406\u9801\u9762\u3002</div>';
    }
  }
}
export {
  createSummary,
  initialize,
  loadPortfolioData
};
