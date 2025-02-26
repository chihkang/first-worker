// src/chart.ts
// Use declare to tell TypeScript these variables exist globally
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
  values: DataPoint[];
  summary: DataSummary;
  [key: string]: any;
}

// Define date parser and formatting functions
const parseTime = d3.timeParse("%Y-%m-%dT%H:%M:%SZ");

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

    try {
        // Ensure all dates are Date objects
        data.values.forEach(d => {
            if (!(d.date instanceof Date)) {
                console.error('Date is not a Date object:', d.date);
                d.date = new Date(d.date);
            }
        });

        // Output date range information
        const minDate = d3.min(data.values, d => d.date);
        const maxDate = d3.max(data.values, d => d.date);
        if (minDate) logDateInfo('Min date', minDate);
        if (maxDate) logDateInfo('Max date', maxDate);

        // Set chart dimensions and margins
        const margin = { top: 50, right: 120, bottom: 80, left: 100 };
        const width = Math.max(800, window.innerWidth - margin.left - margin.right - 40);
        const height = 500;

        // Clear existing chart
        d3.select("#chart").selectAll("*").remove();

        // Create SVG container
        const svg = d3.select("#chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Create scales - ensure correct date range
        const x = d3.scaleTime()
            .domain([
                d3.min(data.values, d => d.date) || new Date(),
                d3.max(data.values, d => d.date) || new Date()
            ])
            .range([0, width]);

        const yMin = d3.min(data.values, d => d.totalValueTwd) || 0;
        const yMax = d3.max(data.values, d => d.totalValueTwd) || 0;
        const yRange = yMax - yMin;

        const y = d3.scaleLinear()
            .domain([
                Math.floor(yMin - yRange * 0.02),
                Math.ceil(yMax + yRange * 0.02)
            ])
            .range([height, 0]);

        // Create grid lines
        function makeXGrid() {
            return d3.axisBottom(x)
                .ticks(d3.timeDay.every(2))
                .tickSize(-height)
                .tickFormat(() => "");
        }

        function makeYGrid() {
            return d3.axisLeft(y)
                .ticks(10)
                .tickSize(-width)
                .tickFormat(() => "");
        }

        // Add X-axis grid lines
        svg.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${height})`)
            .call(makeXGrid())
            .style("stroke-opacity", 0.1);

        // Add Y-axis grid lines
        svg.append("g")
            .attr("class", "grid")
            .call(makeYGrid())
            .style("stroke-opacity", 0.1);

        /**
         * Removed "large gap detection" and changed to draw only one segment,
         * so all points are on the same line.
         */

        // Define curve type - use monotoneX curve, more suitable for time series data
        const curveType = d3.curveMonotoneX;
        
        // Define area generator
        const area = d3.area<DataPoint>()
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

        // Define line generator
        const line = d3.line<DataPoint>()
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

        // Use only one segment, containing all data.values
        const segment = data.values;

        // Draw area
        svg.append("path")
            .datum(segment)
            .attr("class", "area")
            .attr("d", area)
            .style("fill", "rgba(33, 150, 243, 0.1)");

        // Draw line
        svg.append("path")
            .datum(segment)
            .attr("class", "line")
            .attr("d", line)
            .style("stroke", "#2196F3")
            .style("stroke-width", 2)
            .style("fill", "none");

        // Draw X-axis
        const xAxis = d3.axisBottom(x)
            .ticks(d3.timeDay.every(2))
            .tickFormat(d3.timeFormat("%m/%d") as any);
            
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

        // Draw Y-axis
        const yAxis = d3.axisLeft(y)
            .ticks(10)
            .tickFormat((value: any) => (value / 1000000).toFixed(2) + 'M');
            
        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        // Add axis labels
        svg.append("text")
            .attr("class", "axis-label")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .style("text-anchor", "middle")
            .text("日期 (2025年)");

        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -(height / 2))
            .style("text-anchor", "middle")
            .text("總資產價值 (TWD)");

        // Add data points (small circles)
        const points = svg.selectAll(".data-point")
            .data(segment)
            .enter()
            .append("circle")
            .attr("class", "data-point")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.totalValueTwd))
            .attr("r", 4)
            .style("fill", "#2196F3")
            .style("stroke", "white")
            .style("stroke-width", 2);

        // Remove any existing tooltips
        d3.selectAll(".chart-tooltip").remove();
        
        // Add interactive tooltip
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "chart-tooltip tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("padding", "10px")
            .style("border-radius", "5px")
            .style("pointer-events", "none")
            .style("font-size", "12px")
            .style("z-index", "1000")
            .style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)");

        // Add interactivity
        points.on("mouseover", function(event: MouseEvent, d: DataPoint) {
            d3.select(this)
                .attr("r", 8)
                .style("fill", "#FF4081");

            // Format date and values
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
                    <span style="font-weight: bold; color: ${d.changePercent !== undefined && d.changePercent >= 0 ? '#4CAF50' : '#F44336'}">
                        ${formattedChange}
                    </span>
                </div>
            `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("r", 4)
                .style("fill", "#2196F3");

            tooltip.transition()
                .duration(300)
                .style("opacity", 0);
        });

        // Mark highest and lowest points
        const highestPoint: DataPoint = {
            date: data.summary.highestValueDate,
            totalValueTwd: data.summary.highestValue
        };

        const lowestPoint: DataPoint = {
            date: data.summary.lowestValueDate,
            totalValueTwd: data.summary.lowestValue
        };

        // Add highest point marker
        svg.append("circle")
            .attr("class", "highlight-point")
            .attr("cx", x(highestPoint.date))
            .attr("cy", y(highestPoint.totalValueTwd))
            .attr("r", 6)
            .style("fill", "#4CAF50")
            .style("stroke", "white")
            .style("stroke-width", 2);

        svg.append("text")
            .attr("class", "point-label")
            .attr("x", x(highestPoint.date))
            .attr("y", y(highestPoint.totalValueTwd) - 15)
            .attr("text-anchor", "middle")
            .style("fill", "#4CAF50")
            .text(formatMillions(highestPoint.totalValueTwd));

        // Add lowest point marker
        svg.append("circle")
            .attr("class", "highlight-point")
            .attr("cx", x(lowestPoint.date))
            .attr("cy", y(lowestPoint.totalValueTwd))
            .attr("r", 6)
            .style("fill", "#F44336")
            .style("stroke", "white")
            .style("stroke-width", 2);

        svg.append("text")
            .attr("class", "point-label")
            .attr("x", x(lowestPoint.date))
            .attr("y", y(lowestPoint.totalValueTwd) + 25)
            .attr("text-anchor", "middle")
            .style("fill", "#F44336")
            .text(formatMillions(lowestPoint.totalValueTwd));

        // Add legend
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 100}, 0)`);

        legend.append("circle")
            .attr("r", 6)
            .attr("cx", 0)
            .attr("cy", 0)
            .style("fill", "#4CAF50");

        legend.append("text")
            .attr("x", 10)
            .attr("y", 4)
            .text("最高點");

        legend.append("circle")
            .attr("r", 6)
            .attr("cx", 0)
            .attr("cy", 20)
            .style("fill", "#F44336");

        legend.append("text")
            .attr("x", 10)
            .attr("y", 24)
            .text("最低點");

    } catch (error) {
        console.error('Error in createChart:', error);
        throw error;
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
    `;
    document.head.appendChild(style);
}

/**
 * Resize chart when window size changes
 */
export function setupResizeHandler(): void {
    // Add window resize handler
    function resizeChart() {
        const margin = { top: 50, right: 120, bottom: 80, left: 100 };
        const newWidth = Math.max(800, window.innerWidth - margin.left - margin.right - 40);
        
        // Redraw chart
        if ((window as any).chartData) {
            createChart((window as any).chartData); // Assuming data is stored in a global variable
        }
    }

    window.addEventListener('resize', _.debounce(resizeChart, 250));
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
