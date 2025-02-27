// src/chart.ts
declare const d3: any;
declare const _: any;

// Define interfaces for the data structure
interface DataPoint {
  date: Date;
  dateStr?: string;
  dateDay?: string;
  totalValueTwd: number;
  changePercent?: number;
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

interface ChartData {
  portfolioId: string;
  values: DataPoint[];
  summary: DataSummary;
}

/**
 * Logs date information for debugging purposes
 * @param label - Label for the log entry
 * @param date - Date object to log
 */
function logDateInfo(label: string, date: Date | unknown): void {
  if (date instanceof Date) {
    console.log(`${label}: ${date.toISOString()} (${date.getTime()})`);
  } else {
    console.log(`${label}: Not a Date object: ${date}`);
  }
}

/**
 * Formats a number to millions with 2 decimal places
 * @param value - The number to format
 * @returns Formatted string with 'M' suffix
 */
function formatMillions(value: number): string {
  return (value / 1000000).toFixed(2) + 'M';
}

/**
 * Formats a date to the Taiwanese locale format
 * @param dateStr - Date string or Date object
 * @returns Formatted date string
 */
function formatDate(dateStr: string | Date): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-TW', {
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Formats a number as TWD currency
 * @param value - The number to format
 * @returns Formatted currency string
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Formats a number as a percentage with a + sign for positive values
 * @param value - The number to format
 * @returns Formatted percentage string
 */
function formatPercent(value: number): string {
  return (value > 0 ? '+' : '') + value.toFixed(2) + '%';
}

/**
 * Creates a D3 chart with the provided data
 * @param data - The chart data to visualize
 */
export function createChart(data: ChartData): void {
  console.log('Creating chart with data:', data);
  console.log('Data points count:', data.values.length);

  // 清除既有的圖表
  d3.select("#chart").selectAll("*").remove();

  // 檢查數據有效性
  if (!data || !data.values || data.values.length === 0) {
    console.error("Invalid data for chart");
    document.getElementById("chart").innerHTML = '<div class="error">圖表資料無效，請重新整理頁面。</div>';
    return;
  }

  try {
    // 檢查日期範圍
    if (data.values.length > 0) {
      const firstDate = new Date(data.values[0].date);
      const lastDate = new Date(data.values[data.values.length - 1].date);
      console.log('Date range:', firstDate.toISOString(), 'to', lastDate.toISOString());
    }

    // 確保所有日期都是 Date 對象
    data.values.forEach(d => {
      if (!(d.date instanceof Date)) {
        console.log('Converting date:', d.date);
        d.date = new Date(d.date);
      }
    });

    // 輸出日期範圍信息
    const minDate = d3.min(data.values, d => d.date);
    const maxDate = d3.max(data.values, d => d.date);
    console.log('X-axis date range:', minDate, 'to', maxDate);

    // 設定圖表尺寸和邊距
    const margin = { top: 50, right: 50, bottom: 80, left: 60 }; // 減小邊距

    // 獲取容器寬度
    const container = document.getElementById('chart');
    const containerWidth = container.clientWidth;

    // 響應式寬度和高度
    const width = containerWidth - margin.left - margin.right;
    const height = Math.min(500, Math.max(300, containerWidth * 0.5)); // 高度與寬度成比例

    // 建立SVG容器 - 使用響應式設計
    const svg = d3.select("#chart")
      .append("svg")
      .attr("width", "100%") // 使用百分比寬度
      .attr("height", height + margin.top + margin.bottom)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`) // 添加 viewBox
      .attr("preserveAspectRatio", "xMidYMid meet") // 保持比例
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // 建立比例尺 - 確保正確設置日期範圍
    const x = d3.scaleTime()
      .domain([
        minDate || new Date(),
        maxDate || new Date()
      ])
      .range([0, width]);

    console.log('X scale domain:', x.domain());

    const yMin = d3.min(data.values, d => d.totalValueTwd) || 0;
    const yMax = d3.max(data.values, d => d.totalValueTwd) || 0;
    const yRange = yMax - yMin;

    const y = d3.scaleLinear()
      .domain([
        Math.floor(yMin - yRange * 0.02),
        Math.ceil(yMax + yRange * 0.02)
      ])
      .range([height, 0]);

    // 建立網格線
    function makeXGrid() {
      return d3.axisBottom(x)
        .ticks(d3.timeDay.every(2))
        .tickSize(-height)
        .tickFormat("");
    }

    function makeYGrid() {
      return d3.axisLeft(y)
        .ticks(10)
        .tickSize(-width)
        .tickFormat("");
    }

    // 添加X軸網格線
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(makeXGrid())
      .style("stroke-opacity", 0.1);

    // 添加Y軸網格線
    svg.append("g")
      .attr("class", "grid")
      .call(makeYGrid())
      .style("stroke-opacity", 0.1);

    // 定義曲線類型 - 使用monotoneX曲線，更適合時間序列數據
    const curveType = d3.curveMonotoneX;

    // 定義區域生成器
    const area = d3.area()
      .defined(d => {
        const xPos = x(d.date);
        const yPos = y(d.totalValueTwd);
        return !isNaN(xPos) && !isNaN(yPos);
      })
      .x(d => {
        const xPos = x(d.date);
        if (isNaN(xPos)) {
          console.error('Invalid x position for date:', d.date);
          return 0;
        }
        return xPos;
      })
      .y0(height)
      .y1(d => {
        const yPos = y(d.totalValueTwd);
        if (isNaN(yPos)) {
          console.error('Invalid y position for value:', d.totalValueTwd);
          return 0;
        }
        return yPos;
      })
      .curve(curveType);

    // 定義線條生成器
    const line = d3.line()
      .defined(d => {
        const xPos = x(d.date);
        const yPos = y(d.totalValueTwd);
        return !isNaN(xPos) && !isNaN(yPos);
      })
      .x(d => {
        const xPos = x(d.date);
        if (isNaN(xPos)) {
          console.error('Invalid x position for date:', d.date);
          return 0;
        }
        return xPos;
      })
      .y(d => {
        const yPos = y(d.totalValueTwd);
        if (isNaN(yPos)) {
          console.error('Invalid y position for value:', d.totalValueTwd);
          return 0;
        }
        return yPos;
      })
      .curve(curveType);

    // 只用一個 segment，包含全部 data.values
    const segment = data.values;

    // 繪製區域
    svg.append("path")
      .datum(segment)
      .attr("class", "area")
      .attr("d", area)
      .style("fill", "rgba(33, 150, 243, 0.1)");

    // 繪製折線
    svg.append("path")
      .datum(segment)
      .attr("class", "line")
      .attr("d", line)
      .style("stroke", "#2196F3")
      .style("stroke-width", width < 500 ? 1.5 : 2) // 小螢幕上使用更細的線條
      .style("fill", "none");

    // 繪製X軸 - 根據數據點數量調整刻度間隔
    const dataPointCount = data.values.length;
    let tickInterval;

    // 根據螢幕寬度和數據點數量動態調整刻度間隔
    if (width < 500) {
      // 小螢幕上減少刻度數量
      if (dataPointCount <= 30) {
        tickInterval = d3.timeDay.every(5);
      } else if (dataPointCount <= 90) {
        tickInterval = d3.timeDay.every(10);
      } else {
        tickInterval = d3.timeDay.every(20);
      }
    } else {
      // 大螢幕保持原有邏輯
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

    console.log('Using tick interval based on', dataPointCount, 'data points');

    // 創建 x 軸
    const xAxis = d3.axisBottom(x)
      .ticks(tickInterval)
      .tickFormat(d3.timeFormat("%m/%d"));

    // 添加 x 軸
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", function () {
        // 在小螢幕上更改文字方向
        return width < 500 ? "rotate(-90)" : "rotate(-45)";
      })
      .style("font-size", width < 500 ? "9px" : "12px"); // 小螢幕上使用更小的字體

    // 創建 y 軸，根據容器高度調整刻度數量
    const yTickCount = Math.max(3, Math.floor(height / 50));
    const yAxis = d3.axisLeft(y)
      .ticks(yTickCount)
      .tickFormat(value => (value / 1000000).toFixed(1) + 'M');

    // 添加 y 軸
    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .selectAll("text")
      .style("font-size", width < 500 ? "9px" : "12px"); // 小螢幕上使用更小的字體

    // 只在大螢幕上添加座標軸標籤
    if (width >= 400) {
      svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .style("text-anchor", "middle")
        .style("font-size", width < 600 ? "10px" : "12px")
        .text("日期 (2025年)");

      svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -(height / 2))
        .style("text-anchor", "middle")
        .style("font-size", width < 600 ? "10px" : "12px")
        .text("總資產價值 (TWD)");
    }

    // 修改數據點大小和標籤顯示
    const pointSize = width < 500 ? 3 : 4; // 小螢幕上使用更小的點

    // 新增資料點 (小圓點)
    const points = svg.selectAll(".data-point")
      .data(segment)
      .enter()
      .append("circle")
      .attr("class", "data-point")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.totalValueTwd))
      .attr("r", pointSize)
      .style("fill", "#2196F3")
      .style("stroke", "white")
      .style("stroke-width", width < 500 ? 1 : 2);

    // 移除任何現有的提示框
    d3.selectAll(".chart-tooltip").remove();

    // 新增互動提示框
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "chart-tooltip tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", width < 500 ? "8px" : "10px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("font-size", width < 500 ? "10px" : "12px")
      .style("z-index", "1000")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)")
      .style("max-width", width < 500 ? "150px" : "180px")
      .style("min-width", width < 500 ? "120px" : "150px");

    // 添加互動效果
    points.on("mouseover", function (event, d) {
      d3.select(this)
        .attr("r", width < 500 ? 6 : 8)
        .style("fill", "#FF4081");

      // 格式化日期和數值
      const formattedDate = d.date instanceof Date
        ? d.date.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
        : formatDate(d.date);

      const formattedValue = formatCurrency(d.totalValueTwd);
      const formattedChange = d.changePercent !== undefined
        ? formatPercent(d.changePercent)
        : "N/A";

      tooltip.transition()
        .duration(200)
        .style("opacity", 1);

      tooltip.html(`
        <div style="margin-bottom: 5px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 5px;">
          ${formattedDate}
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span>總值:</span>
          <span style="font-weight: bold;">${formattedValue}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>變化:</span>
          <span style="font-weight: bold; color: ${d.changePercent >= 0 ? '#4CAF50' : '#F44336'}">
            ${formattedChange}
          </span>
        </div>
      `);

      // 智能定位工具提示
      const tooltipWidth = width < 500 ? 150 : 180; // 估計的工具提示寬度
      const tooltipHeight = width < 500 ? 80 : 100; // 估計的工具提示高度

      // 獲取視窗尺寸
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // 計算工具提示位置
      let tooltipX = event.pageX + 15;
      let tooltipY = event.pageY - 15;

      // 檢查右邊界
      if (tooltipX + tooltipWidth > windowWidth) {
        tooltipX = event.pageX - tooltipWidth - 15; // 放在左側
      }

      // 檢查下邊界
      if (tooltipY + tooltipHeight > windowHeight) {
        tooltipY = event.pageY - tooltipHeight - 15; // 放在上方
      }

      // 應用計算的位置
      tooltip
        .style("left", tooltipX + "px")
        .style("top", tooltipY + "px");
    })
      .on("mouseout", function () {
        d3.select(this)
          .attr("r", pointSize)
          .style("fill", "#2196F3");

        tooltip.transition()
          .duration(300)
          .style("opacity", 0);
      });

    // 在 createChart 函數中，添加這些調試日誌
    console.log('Chart data summary:', data.summary);
    console.log('Highest point date:', data.summary.highestValueDate);
    console.log('Lowest point date:', data.summary.lowestValueDate);
    console.log('X domain:', x.domain());

    // 標記最高點和最低點
    const highestPoint = {
      date: new Date(data.summary.highestValueDate),
      totalValueTwd: data.summary.highestValue
    };

    const lowestPoint = {
      date: new Date(data.summary.lowestValueDate),
      totalValueTwd: data.summary.lowestValue
    };

    console.log('Highest point for drawing:', highestPoint);
    console.log('Lowest point for drawing:', lowestPoint);
    console.log('X position for highest point:', x(highestPoint.date));
    console.log('X position for lowest point:', x(lowestPoint.date));
    console.log('Y position for highest point:', y(highestPoint.totalValueTwd));
    console.log('Y position for lowest point:', y(lowestPoint.totalValueTwd));

    // 檢查 x 位置是否有效
    if (isNaN(x(highestPoint.date)) || isNaN(y(highestPoint.totalValueTwd))) {
      console.error('Invalid position for highest point');

      // 嘗試在數據中找到最高點
      let maxValue = -Infinity;
      let maxValuePoint = null;

      for (const point of data.values) {
        if (point.totalValueTwd > maxValue) {
          maxValue = point.totalValueTwd;
          maxValuePoint = point;
        }
      }

      if (maxValuePoint) {
        console.log('Using calculated highest point from data:', maxValuePoint);
        highestPoint.date = maxValuePoint.date;
        highestPoint.totalValueTwd = maxValuePoint.totalValueTwd;
      }
    }

    if (isNaN(x(lowestPoint.date)) || isNaN(y(lowestPoint.totalValueTwd))) {
      console.error('Invalid position for lowest point');

      // 嘗試在數據中找到最低點
      let minValue = Infinity;
      let minValuePoint = null;

      for (const point of data.values) {
        if (point.totalValueTwd < minValue) {
          minValue = point.totalValueTwd;
          minValuePoint = point;
        }
      }

      if (minValuePoint) {
        console.log('Using calculated lowest point from data:', minValuePoint);
        lowestPoint.date = minValuePoint.date;
        lowestPoint.totalValueTwd = minValuePoint.totalValueTwd;
      }
    }

    // 再次檢查位置
    console.log('Final X position for highest point:', x(highestPoint.date));
    console.log('Final X position for lowest point:', x(lowestPoint.date));

    // 添加最高點標記
    if (!isNaN(x(highestPoint.date)) && !isNaN(y(highestPoint.totalValueTwd))) {
      svg.append("circle")
        .attr("class", "highlight-point")
        .attr("cx", x(highestPoint.date))
        .attr("cy", y(highestPoint.totalValueTwd))
        .attr("r", width < 500 ? 5 : 6)
        .style("fill", "#4CAF50")
        .style("stroke", "white")
        .style("stroke-width", width < 500 ? 1 : 2);

      if (width >= 500) {
        svg.append("text")
          .attr("class", "point-label")
          .attr("x", x(highestPoint.date))
          .attr("y", y(highestPoint.totalValueTwd) - 15)
          .attr("text-anchor", "middle")
          .style("fill", "#4CAF50")
          .style("font-size", width < 600 ? "10px" : "12px")
          .text(formatMillions(highestPoint.totalValueTwd));
      }
    }

    // 添加最低點標記
    if (!isNaN(x(lowestPoint.date)) && !isNaN(y(lowestPoint.totalValueTwd))) {
      svg.append("circle")
        .attr("class", "highlight-point")
        .attr("cx", x(lowestPoint.date))
        .attr("cy", y(lowestPoint.totalValueTwd))
        .attr("r", width < 500 ? 5 : 6)
        .style("fill", "#F44336")
        .style("stroke", "white")
        .style("stroke-width", width < 500 ? 1 : 2);

      if (width >= 500) {
        svg.append("text")
          .attr("class", "point-label")
          .attr("x", x(lowestPoint.date))
          .attr("y", y(lowestPoint.totalValueTwd) + 25)
          .attr("text-anchor", "middle")
          .style("fill", "#F44336")
          .style("font-size", width < 600 ? "10px" : "12px")
          .text(formatMillions(lowestPoint.totalValueTwd));
      }
    }

    // 添加圖例 - 根據螢幕尺寸調整位置和大小
    const legendX = width < 500 ? width - 70 : width - 100;
    const legendFontSize = width < 500 ? "10px" : "12px";

    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${legendX}, 0)`);

    legend.append("circle")
      .attr("r", width < 500 ? 5 : 6)
      .attr("cx", 0)
      .attr("cy", 0)
      .style("fill", "#4CAF50");

    legend.append("text")
      .attr("x", 10)
      .attr("y", 4)
      .style("font-size", legendFontSize)
      .text("最高點");

    legend.append("circle")
      .attr("r", width < 500 ? 5 : 6)
      .attr("cx", 0)
      .attr("cy", 20)
      .style("fill", "#F44336");

    legend.append("text")
      .attr("x", 10)
      .attr("y", 24)
      .style("font-size", legendFontSize)
      .text("最低點");


  } catch (error) {
    console.error('Error in createChart:', error);
    document.getElementById("chart").innerHTML = '<div class="error">圖表載入失敗，請重新整理頁面。</div>';

    // 添加自動重試
    setTimeout(() => {
      if ((window as any).chartData) {
        console.log("Retrying chart creation...");
        createChart((window as any).chartData);
      }
    }, 1000);
  }
}

/**
 * Add CSS styles for the chart
 */
export function addChartStyles(): void {
  // Add CSS style
  const style = document.createElement('style');
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
    
    /* 響應式樣式 */
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
        transition: none; /* 在小螢幕上禁用過渡效果以提高性能 */
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

/**
 * Resize chart when window size changes
 */
export function setupResizeHandler(): void {
  let resizeTimeout: number | null = null;

  function resizeChart() {
    if ((window as any).chartData) {
      createChart((window as any).chartData);
    }
  }

  window.addEventListener('resize', function () {
    // 清除之前的 timeout
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }

    // 設置新的 timeout，避免頻繁重繪
    resizeTimeout = window.setTimeout(resizeChart, 250) as unknown as number;
  });
}

// Export all functions
export {
  formatMillions,
  formatDate,
  formatCurrency,
  formatPercent,
  logDateInfo
};

// Also export a default object with all functions
export default {
  createChart,
  addChartStyles,
  setupResizeHandler,
  formatMillions,
  formatDate,
  formatCurrency,
  formatPercent
};