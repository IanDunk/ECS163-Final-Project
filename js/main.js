import { currencyRatesToUSD } from './currencyRates.js';

// Global variables
let combined_movies_data = null;
let customGeoJSON = null;
let movieCountsByYear = {};
let selectedCountry = "United States of America"; 

// Filter state
let selectedYear = 2024;
let minRating = 7;
let minVotes = 10000;
let mapMetric = "count"; 
let adjustForInflation = false;
let chartMode = "average"; 
let minChartYear = 1925;
let maxChartYear = 2024;

// D3 selections for map
let svgMap, gMap, projectionMap, pathMap, zoomMap, legendGroupMap;

// Page identifier
let currentPage = null; 

// Scatter Plot variables for user-provided functions
let scatterSvg, scatterView, dotsScatter; // these are global for updateHighBudgetScatter to manage
let xScatter, yScatter; // scales for scatter plot
let xAxisScatterG, yAxisScatterG; // axis groups for scatter plot
let scatterZoom; // zoom behavior for scatter plot
let showProfitRatio = false; // Toggle for scatter y-axis

const historicalCPI = {
    1925: 17.5, 1926: 17.7, 1927: 17.4, 1928: 17.2, 1929: 17.2,
    1930: 16.7, 1931: 15.2, 1932: 13.6, 1933: 12.9, 1934: 13.4,
    1935: 13.7, 1936: 13.9, 1937: 14.4, 1938: 14.1, 1939: 13.9,
    1940: 14.0, 1941: 14.7, 1942: 16.3, 1943: 17.3, 1944: 17.6,
    1945: 18.0, 1946: 19.5, 1947: 22.3, 1948: 24.0, 1949: 23.8,
    1950: 24.1, 1951: 26.0, 1952: 26.6, 1953: 26.8, 1954: 26.9,
    1955: 26.8, 1956: 27.2, 1957: 28.1, 1958: 28.9, 1959: 29.2,
    1960: 29.6, 1961: 29.9, 1962: 30.3, 1963: 30.6, 1964: 31.0,
    1965: 31.5, 1966: 32.5, 1967: 33.4, 1968: 34.8, 1969: 36.7,
    1970: 38.8, 1971: 40.5, 1972: 41.8, 1973: 44.4, 1974: 49.3,
    1975: 53.8, 1976: 56.9, 1977: 60.6, 1978: 65.2, 1979: 72.6,
    1980: 82.4, 1981: 90.9, 1982: 96.5, 1983: 99.6, 1984: 103.9,
    1985: 107.6, 1986: 109.6, 1987: 113.6, 1988: 118.3, 1989: 124.0,
    1990: 130.7, 1991: 136.2, 1992: 140.3, 1993: 144.5, 1994: 148.2,
    1995: 152.4, 1996: 156.9, 1997: 160.5, 1998: 163.0, 1999: 166.6,
    2000: 172.2, 2001: 177.1, 2002: 179.9, 2003: 184.0, 2004: 188.9,
    2005: 195.3, 2006: 201.6, 2007: 207.3, 2008: 215.3, 2009: 214.5,
    2010: 218.1, 2011: 224.9, 2012: 229.6, 2013: 233.0, 2014: 236.7,
    2015: 237.0, 2016: 240.0, 2017: 245.1, 2018: 251.1, 2019: 255.7,
    2020: 258.8, 2021: 271.0, 2022: 292.7, 2023: 304.7, 2024: 314.4, 
    2025: 321.5 
};

const countryNameFixes = {
    "Bosnia and Herzegovina": "Bosnia and Herz.", "Cayman Islands": "Cayman Is.",
    "Central African Republic": "Central African Rep.", "Czech Republic": "Czechia",
    "Czechoslovakia": "Czechia", "Dominican Republic": "Dominican Rep.",
    "East Germany": "Germany", "Federal Republic of Yugoslavia": "Serbia",
    "Gibraltar": "United Kingdom", "Guadeloupe": "France", "Korea": "South Korea", 
    "Martinique": "France", "Netherlands Antilles": "Netherlands", "North Vietnam": "Vietnam", 
    "Occupied Palestinian Territory": "Palestine", "Reunion": "France",
    "Saint Kitts and Nevis": "St. Kitts and Nevis", "Serbia and Montenegro": "Serbia",
    "Siam": "Thailand", "Soviet Union": "Russia", "Swaziland": "Eswatini",
    "The Democratic Republic of Congo": "Dem. Rep. Congo", 
    "United States": "United States of America",
    "West Germany": "Germany", "Yugoslavia": "Serbia"
};

// --- USER-PROVIDED HELPER FUNCTIONS (and other existing utilities) ---
function adjustForInflationAmount(amount, year) {
    if (!adjustForInflation || !historicalCPI[year] || !amount || amount <= 0) return amount;
    return amount * (historicalCPI[2025] / historicalCPI[year]);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const context = this;
        const later = () => { timeout = null; func.apply(context, args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// function to turn the money string into a number in USD
function toUSD(moneyStr) {
    if (!moneyStr) {
        return 0;
    }
    var txt = String(moneyStr).trim(); // Ensure it's a string
    var symbolMatch = txt.match(/^([^\d\s\.,]+)/);
    if (symbolMatch) {
        var symbol = symbolMatch[1].toUpperCase();
        var numeric = parseFloat(txt.replace(/[^0-9\.]/g, ""));
        if (isNaN(numeric)) {
            numeric = 0;
        }
        var rate = currencyRatesToUSD[symbol];
        if (!rate) { 
             if (symbol === '$') rate = 1;
             else {
                // console.warn(`No rate for symbol: ${symbol}, using direct parse for: ${txt}`);
                return numeric; 
             }
        }
        return numeric * rate;
    }
    var codeMatch = txt.match(/([A-Z]{3})$/i); 
    if (codeMatch) {
        var code = codeMatch[1].toUpperCase();
        var numericCode = parseFloat(txt.replace(/[^0-9\.]/g, ""));
        if (isNaN(numericCode)) {
            numericCode = 0;
        }
        var codeRate = currencyRatesToUSD[code];
        if (!codeRate) {
            // console.warn(`No rate for code: ${code}, using direct parse for: ${txt}`);
            return numericCode; 
        }
        return numericCode * codeRate;
    }
    var fallback = parseFloat(txt.replace(/[^0-9\.]/g, ""));
    return isNaN(fallback) ? 0 : fallback;
}

// the function to format a number into a short string
function fmtMoney(n) {
    if (isNaN(n) || n === null) return "N/A";
    if (Math.abs(n) >= 1000000000) {
        return "$" + (n / 1000000000).toFixed(1) + "B"; 
    }
    if (Math.abs(n) >= 1000000) {
        return "$" + (n / 1000000).toFixed(1) + "M"; 
    }
    if (Math.abs(n) >= 1000) {
        return "$" + (n / 1000).toFixed(0) + "K";
    }
    return "$" + n.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: (n % 1 === 0 ? 0 : 2)});
}

// function to clean up an format the data, like in stars, writers, ect
function cleanArray(str) {
    if (!str) return "";
    try { 
        return JSON.parse(String(str).replace(/'/g, '"')).join(", ");
    } catch {
        return String(str).replace(/[\[\]']+/g, "");
    }
}

var currentSortKey = "BudgetUSD"; // Not used by scatter plot but part of provided helpers
var currentAscending = false;    // Not used by scatter plot but part of provided helpers


// --- Data loading and initial setup ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('map-container')) { 
        currentPage = 'full_dashboard'; 
    } else if (document.getElementById('line-chart-container-journey')) { 
        currentPage = 'journey';
    } else {
        console.warn("Page type undetermined or missing critical containers.");
        return;
    }
    console.log("Current page determined as:", currentPage);

    Promise.all([
        d3.csv("data/combined_movies_data.csv"), 
        d3.json("data/custom.geo.json")      
    ]).then(([movieData, geoData]) => {
        combined_movies_data = movieData;
        customGeoJSON = geoData;
        
        if (currentPage === 'journey') {
            initializeJourneyPageLineChart();
        } else if (currentPage === 'full_dashboard') {
            initializeFullDashboardPage();
        }
    }).catch(error => {
        console.error("Error loading data:", error);
        // Error display logic...
    });
});


// --- INITIALIZATION FUNCTIONS ---
function initializeFullDashboardPage() {
    console.log("Initializing Full Dashboard Page");
    createMap(); 
    if (document.getElementById('line-chart-container')) {
        const dashboardChartG = createLineChart('line-chart-container', 'line-chart');
        if (dashboardChartG) {
            updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
        }
    }
    processMovieData(); 
    setupDashboardControlsEventListeners(); 
    updateDashboardStatistics(movieCountsByYear[selectedYear] || {});
}

function initializeJourneyPageLineChart() { 
    console.log("Initializing Journey Page (Line Chart)");
    selectedCountry = "United States of America"; 
    mapMetric = "revenue"; 
    chartMode = "average"; 
    minChartYear = 1925;   
    maxChartYear = 2025;
    adjustForInflation = false; 
    const journeyChartG = createLineChart('line-chart-container-journey', 'line-chart-journey');
    if (journeyChartG) {
        updateChartTitleAndLabels('chart-title-journey', 'selected-country-journey', journeyChartG);
        processMovieData();
        updateLineChart('line-chart-journey', journeyChartG);
    }
}

// --- DATA PROCESSING ---
function processMovieData() {
    movieCountsByYear = {};
    if (!combined_movies_data) {
        console.warn("Movie data not loaded for processing.");
        return;
    }
    const currentMinRating = (currentPage === 'journey') ? 0 : minRating;
    const currentMinVotes = (currentPage === 'journey') ? 0 : minVotes;

    for (const d of combined_movies_data) {
        const year = +d.Year;
        const rating = +d.Rating;
        const revenueStr = d.grossWorldWWide; 
        const voteStr = d.Votes;

        if (!year || !d.countries_origin || isNaN(rating) || rating < currentMinRating) continue;
        let votes = 0;
        if (voteStr) {
            const cleaned = String(voteStr).trim().toUpperCase();
            if (cleaned.endsWith("K")) votes = parseFloat(cleaned.replace("K", "")) * 1000;
            else if (cleaned.endsWith("M")) votes = parseFloat(cleaned.replace("M", "")) * 1000000;
            else votes = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
        }
        if (isNaN(votes) || votes < currentMinVotes) continue;
        let revenueForCharts = 0;
        if(revenueStr){
            revenueForCharts = toUSD(revenueStr);
        }
        const processedRevenue = adjustForInflationAmount(revenueForCharts, year);
        let countries;
        try {
            countries = JSON.parse(String(d.countries_origin).replace(/'/g, '"'));
        } catch (e) { try { countries = eval(String(d.countries_origin)); } catch (e2) { /* console.warn("Could not parse countries:", d.countries_origin); */ continue; } }
        if (!Array.isArray(countries)) continue;
        if (!movieCountsByYear[year]) movieCountsByYear[year] = {};
        for (let country of countries) {
            country = countryNameFixes[country] || country;
            if (!movieCountsByYear[year][country]) {
                movieCountsByYear[year][country] = { count: 0, revenue: 0, ratingSum: 0, ratingCount: 0 };
            }
            movieCountsByYear[year][country].count++;
            movieCountsByYear[year][country].revenue += processedRevenue; 
            movieCountsByYear[year][country].ratingSum += rating;
            movieCountsByYear[year][country].ratingCount++;
        }
    }

    if (svgMap) { 
        updateMapVisualization();
    }
    const dashboardChartG = d3.select("#line-chart").select("g");
    if (!dashboardChartG.empty()) {
        updateLineChart('line-chart', dashboardChartG);
    }
    if(currentPage === 'journey') {
        const journeyChartG = d3.select("#line-chart-journey").select("g");
        if (!journeyChartG.empty()) {
            updateLineChart('line-chart-journey', journeyChartG);
        }
    }
    if (currentPage === 'full_dashboard') { 
        updateHighBudgetScatter(); 
        updateDashboardStatistics(movieCountsByYear[selectedYear] || {});
    }
}


// --- MAP FUNCTIONS ---
function createMap() {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) { console.warn("Map container not found for createMap."); return; }
    const loadingEl = mapContainer.querySelector('.loading');
    if (loadingEl) loadingEl.style.display = 'none';
    d3.select(mapContainer).select("svg").remove();
    const width = mapContainer.clientWidth;
    const height = mapContainer.clientHeight || 600; 
    svgMap = d3.select("#map-container").append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "transparent"); 
    gMap = svgMap.append("g");
    projectionMap = d3.geoMercator().scale(Math.min(width / 6.2, height / 3.6)).translate([width / 2, height / 1.75]);
    pathMap = d3.geoPath(projectionMap);
    zoomMap = d3.zoom().scaleExtent([1, 12]).on("zoom", () => {
        if (d3.event && d3.event.transform) gMap.attr("transform", d3.event.transform);
    });
    svgMap.call(zoomMap);
    gMap.selectAll("path.country")
        .data(customGeoJSON.features)
        .enter().append("path")
        .attr("d", pathMap)
        .attr("class", "country")
        .attr("stroke", "#4A5568") 
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("click", handleMapCountryClick) 
        .on("mouseover", handleMapMouseOver)
        .on("mousemove", handleMapMouseMove)
        .on("mouseout", handleMapMouseOut);
    createMapLegend();
}

function updateMapVisualization() {
    if (!svgMap || !customGeoJSON || !movieCountsByYear) { return; }
    const dataForYear = movieCountsByYear[selectedYear] || {};
    let maxValue, colorScale;
    if (mapMetric === "count") {
        maxValue = d3.max(Object.values(dataForYear), d => d.count || 0) || 1;
        colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxValue]); 
    } else { 
        maxValue = 10;
        colorScale = d3.scaleSequential(d3.interpolateCool).domain([0, maxValue]); 
    }
    gMap.selectAll("path.country")
        .transition().duration(500)
        .attr("fill", d => {
            const countryData = dataForYear[d.properties.name];
            if (!countryData) return "#2D3748"; 
            if (mapMetric === "count") return colorScale(countryData.count);
            return countryData.ratingCount > 0 ? colorScale(countryData.ratingSum / countryData.ratingCount) : "#2D3748"; 
        });
    updateMapLegend(colorScale, maxValue);
}

function resetMapZoom() {
    if (svgMap && zoomMap) svgMap.transition().duration(750).call(zoomMap.transform, d3.zoomIdentity);
}

function createMapLegend() {
    if (!svgMap) return;
    const mapContainer = document.getElementById('map-container');
    const height = mapContainer ? mapContainer.clientHeight || 600 : 600;
    legendGroupMap = svgMap.append("g")
        .attr("class", "legend-map") 
        .attr("transform", `translate(20, ${height - 70})`); 
    legendGroupMap.append("rect")
        .attr("x", -10).attr("y", -30)
        .attr("width", 280).attr("height", 70)
        .attr("fill", "rgba(20, 20, 40, 0.9)") 
        .attr("stroke", "#555E70") 
        .attr("rx", 8);
}

function updateMapLegend(colorScale, maxValue) {
    if (!legendGroupMap || !colorScale) return;
    legendGroupMap.selectAll(".legend-content").remove();
    const legendContent = legendGroupMap.append("g").attr("class", "legend-content");
    const title = mapMetric === "count" ? "Movie Count" : "Average IMDb Rating";
    legendContent.append("text").attr("x", 0).attr("y", -10)
        .style("font-size", "14px").style("font-weight", "600")
        .style("fill", "#E0E0E0").text(title); 
    const gradientId = "map-legend-gradient-" + mapMetric + Date.now(); 
    const defs = legendContent.append("defs");
    const linearGradient = defs.append("linearGradient").attr("id", gradientId);
    for (let i = 0; i <= 10; i++) {
        linearGradient.append("stop").attr("offset", `${i * 10}%`).attr("stop-color", colorScale((i / 10) * maxValue));
    }
    legendContent.append("rect").attr("x", 0).attr("y", 0).attr("width", 260).attr("height", 15).style("fill", `url(#${gradientId})`);
    const formatValue = mapMetric === "count" ? d3.format(",") : (d => d.toFixed(1));
    legendContent.append("text").attr("x", 0).attr("y", 30).style("font-size", "12px")
        .style("fill", "#E0E0E0").text("0"); 
    legendContent.append("text").attr("x", 260).attr("y", 30).style("font-size", "12px").style("text-anchor", "end")
        .style("fill", "#E0E0E0").text(formatValue(maxValue)); 
    legendContent.append("text").attr("x", 130).attr("y", 30).style("font-size", "12px").style("text-anchor", "middle")
        .style("fill", "#E0E0E0").text(formatValue(maxValue / 2)); 
}

function handleMapMouseOver(d_map) { // Renamed 'd' to 'd_map' to avoid scope collision
    if (currentPage !== 'full_dashboard') return;
    d3.select(this).transition().duration(100)
        .attr("stroke-width", 1.5) 
        .attr("stroke", "#82aaff"); 
}

function handleMapMouseMove(d_map) { 
    if (currentPage !== 'full_dashboard') return;
    const tooltipEl = document.querySelector('.tooltip'); 
    if (!tooltipEl || !movieCountsByYear) return;
    const dataForYear = movieCountsByYear[selectedYear] || {};
    const countryData = dataForYear[d_map.properties.name];
    const totalMoviesInYear = d3.sum(Object.values(dataForYear), item => item.count || 0);
    let content = `<strong>${d_map.properties.name}</strong><br>`;
    if (!countryData) {
        content += '<div class="tooltip-row">No data for current filters</div>';
    } else {
        const { count, revenue, ratingSum, ratingCount } = countryData;
        const percentOfTotal = totalMoviesInYear > 0 ? ((count / totalMoviesInYear) * 100).toFixed(1) : "0.0";
        const avgRatingDisplay = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : "N/A";
        let revenueDisplay = "N/A";
        if (revenue > 0) { 
            revenueDisplay = fmtMoney(revenue); 
        } else if (revenue === 0 && count > 0) revenueDisplay = "$0";
        const revenueLabelText = adjustForInflation ? "Revenue (2025 $)" : "Revenue";
        content += `<div class="tooltip-row">Movies: ${count} (${percentOfTotal}%)</div>`;
        content += `<div class="tooltip-row">${revenueLabelText}: ${revenueDisplay}</div>`;
        content += `<div class="tooltip-row">Avg IMDb Rating: ${avgRatingDisplay}</div>`;
    }
    tooltipEl.innerHTML = content;
    tooltipEl.style.opacity = 0.95; 
    const event = d3.event; // For D3 v5
    if (event) { 
        tooltipEl.style.left = (event.pageX + 10) + "px"; 
        tooltipEl.style.top = (event.pageY - 28) + "px"; // Adjusted for better positioning
    }
}

function handleMapMouseOut() {
    if (currentPage !== 'full_dashboard') return;
    d3.select(this).transition().duration(100)
        .attr("stroke-width", 0.5)
        .attr("stroke", "#4A5568"); 
    const tooltipEl = document.querySelector('.tooltip');
    if (tooltipEl) tooltipEl.style.opacity = 0;
}

function handleMapCountryClick(d_map) {
    if (currentPage !== 'full_dashboard') return;
    selectedCountry = d_map.properties.name; 
    const dashboardChartG = d3.select("#line-chart").select("g"); 
    if (!dashboardChartG.empty()) {
         updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
         updateLineChart('line-chart', dashboardChartG);
    }
    const lineChartSection = document.querySelector('#line-chart-container');
    if(lineChartSection) {
        const vizContainer = lineChartSection.closest('.viz-container');
        if(vizContainer) vizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// --- LINE CHART FUNCTIONS ---
const lineMargin = {top: 30, right: 40, bottom: 60, left: 90};
function createLineChart(containerId = "line-chart-container", svgId = "line-chart") {
    const container = document.getElementById(containerId);
    if (!container) { console.warn(`Line chart container #${containerId} not found.`); return null; }
    const svgElement = document.getElementById(svgId);
    if (!svgElement) { console.warn(`Line chart SVG element #${svgId} not found.`); return null; }
    const width = container.clientWidth;
    const height = container.clientHeight || (currentPage === 'journey' ? 450 : 400); 
    const currentLineChartSvg = d3.select("#" + svgId) 
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "transparent"); 
    const innerWidth = width - lineMargin.left - lineMargin.right;
    const innerHeight = height - lineMargin.top - lineMargin.bottom;
    currentLineChartSvg.selectAll("*").remove(); 
    const currentLineChartG = currentLineChartSvg.append("g")
        .attr("transform", `translate(${lineMargin.left}, ${lineMargin.top})`);
    currentLineChartG.append("g").attr("class", "grid x-grid");
    currentLineChartG.append("g").attr("class", "grid y-grid");
    currentLineChartG.append("g").attr("class", "axis x-axis").attr("transform", `translate(0, ${innerHeight})`);
    currentLineChartG.append("g").attr("class", "axis y-axis");
    currentLineChartG.append("text").attr("class", "axis-label x-axis-label")
        .attr("text-anchor", "middle").attr("x", innerWidth / 2).attr("y", innerHeight + lineMargin.bottom - 15).text("Year");
    currentLineChartG.append("text").attr("class", "axis-label y-axis-label") 
        .attr("text-anchor", "middle").attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2).attr("y", -lineMargin.left + 25).text("Value"); 
    currentLineChartG.append("path").attr("class", "line-path").attr("stroke", "#82aaff").attr("fill", "none").attr("stroke-width", 2.5); 
    currentLineChartG.append("defs").append("clipPath").attr("id", `trend-line-clip-${svgId}`) 
        .append("rect").attr("x", 0).attr("y", 0).attr("width", innerWidth).attr("height", innerHeight);
    currentLineChartG.append("path").attr("class", "trend-line")
        .attr("stroke", "#f59e0b").attr("stroke-dasharray", "6,6").attr("fill", "none").attr("stroke-width", 2) 
        .attr("clip-path", `url(#trend-line-clip-${svgId})`);
    currentLineChartG.append("g").attr("class", "dots-group");
    if (currentPage !== 'journey') { 
        const legendChart = currentLineChartG.append("g").attr("class", "chart-legend-lines")
            .attr("transform", `translate(${innerWidth - 90}, -10)`); 
        legendChart.append("rect").attr("x", -5).attr("y", -5).attr("width", 85).attr("height", 45)
            .attr("fill", "rgba(20, 20, 40, 0.9)") 
            .attr("stroke", "#555E70") 
            .attr("rx", 4);
        legendChart.append("line").attr("x1", 0).attr("x2", 20).attr("y1", 5).attr("y2", 5).attr("stroke", "#82aaff").attr("stroke-width", 2);
        legendChart.append("text").attr("x", 25).attr("y", 10).text("Data").style("font-size", "12px").style("fill", "#E0E0E0"); 
        legendChart.append("line").attr("x1", 0).attr("x2", 20).attr("y1", 25).attr("y2", 25).attr("stroke", "#f59e0b").attr("stroke-width", 2).attr("stroke-dasharray", "6,6");
        legendChart.append("text").attr("x", 25).attr("y", 30).text("Trend").style("font-size", "12px").style("fill", "#E0E0E0"); 
    }
    return currentLineChartG; 
}

function updateChartTitleAndLabels(titleId = "chart-title", countryDisplayId = "selected-country", targetChartG) {
    const chartTitleEl = document.getElementById(titleId);
    const selectedCountryEl = document.getElementById(countryDisplayId);
    if (selectedCountryEl) selectedCountryEl.textContent = selectedCountry; 
    let titleText = "";
    let yAxisLabelText = "";
    const currentMetric = (currentPage === 'journey') ? 'revenue' : mapMetric; 
    const currentMode = (currentPage === 'journey') ? 'average' : chartMode; 
    const currentInflation = (currentPage === 'journey') ? false : adjustForInflation;
    if (currentMetric === "rating") { 
        titleText = currentMode === "total" ? "Movie Count per Year" : "Average Rating per Year";
        yAxisLabelText = currentMode === "total" ? 'Number of Movies' : 'Average IMDb Rating';
        const inflationButton = document.getElementById('inflation-btn'); 
        if (inflationButton && currentPage === 'full_dashboard' ) { 
            inflationButton.style.opacity = '0.5'; inflationButton.style.cursor = 'not-allowed';
            inflationButton.title = 'Inflation adjustment not applicable to ratings';
        }
    } else { 
        titleText = currentMode === "total" ? "Total Revenue per Year" : "Average Revenue per Movie";
        if (currentMode === "total") {
            yAxisLabelText = currentInflation ? 'Total Revenue (2025 $)' : 'Total Revenue ($)';
        } else {
            yAxisLabelText = currentInflation ? 'Avg. Revenue (2025 $)' : 'Avg. Revenue ($)';
        }
        const inflationButton = document.getElementById('inflation-btn');
        if (inflationButton && currentPage === 'full_dashboard') {
            inflationButton.style.opacity = '1'; inflationButton.style.cursor = 'pointer';
            inflationButton.title = '';
        }
    }
    if (chartTitleEl) chartTitleEl.textContent = titleText;
    if (targetChartG && targetChartG.select) { 
         targetChartG.select('.y-axis-label').text(yAxisLabelText);
    }
}

function calculateLinearRegression(data) { 
    if (!data || data.length < 2) return null;
    const n = data.length;
    const sumX = d3.sum(data, d => d.year);
    const sumY = d3.sum(data, d => d.value); 
    const sumXY = d3.sum(data, d => d.year * d.value);
    const sumXX = d3.sum(data, d => d.year * d.year);
    if ((n * sumXX - sumX * sumX) === 0) return null; 
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

function calculateRatingData(countryForChart) {
    const ratingByYear = {};
    if (!combined_movies_data) return [];
    const useGlobalFilters = (currentPage === 'full_dashboard');
    const currentMinRating = useGlobalFilters ? minRating : 0;
    const currentMinVotes = useGlobalFilters ? minVotes : 0;  
    const currentChartModeForCalc = useGlobalFilters ? chartMode : 'average'; 
    for (const d of combined_movies_data) {
        const year = +d.Year;
        const rating = +d.Rating;
        const voteStr = d.Votes;
        if (!year || !d.countries_origin || isNaN(rating) || rating < currentMinRating) continue;
        let votes = 0;
        if (voteStr) {
            const cleaned = String(voteStr).trim().toUpperCase();
            if (cleaned.endsWith("K")) votes = parseFloat(cleaned.replace("K", "")) * 1000;
            else if (cleaned.endsWith("M")) votes = parseFloat(cleaned.replace("M", "")) * 1000000;
            else votes = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
        }
        if (isNaN(votes) || votes < currentMinVotes) continue;
        let countries;
        try { countries = JSON.parse(String(d.countries_origin).replace(/'/g, '"'));}
        catch (e) { try { countries = eval(String(d.countries_origin)); } catch (e2) { continue; } }
        if (!Array.isArray(countries)) continue;
        const fixedCountries = countries.map(c => countryNameFixes[c] || c);
        if (!fixedCountries.includes(countryForChart)) continue;
        if (!ratingByYear[year]) ratingByYear[year] = { totalRating: 0, count: 0 };
        ratingByYear[year].totalRating += rating;
        ratingByYear[year].count += 1;
    }
    const allRatingData = [];
    for (let yr = 1925; yr <= 2025; yr++) {
        if (ratingByYear[yr] && ratingByYear[yr].count > 0) {
            const dataPoint = { year: yr, count: ratingByYear[yr].count };
            dataPoint.value = currentChartModeForCalc === "total" ? ratingByYear[yr].count : ratingByYear[yr].totalRating / ratingByYear[yr].count;
            allRatingData.push(dataPoint);
        }
    }
    const currentMinChartYearRange = useGlobalFilters ? minChartYear : 1925;
    const currentMaxChartYearRange = useGlobalFilters ? maxChartYear : 2025;
    return allRatingData.filter(d => d.year >= currentMinChartYearRange && d.year <= currentMaxChartYearRange);
}

function calculateRevenueData(countryForChart) {
    const revenueByYear = {};
    if (!combined_movies_data) return [];
    const useGlobalFilters = (currentPage === 'full_dashboard');
    const currentMinRating = useGlobalFilters ? minRating : 0;
    const currentMinVotes = useGlobalFilters ? minVotes : 0;  
    const currentInflationSetting = useGlobalFilters ? adjustForInflation : false; 
    const currentChartModeForCalc = useGlobalFilters ? chartMode : 'average';
    for (const d of combined_movies_data) {
        const year = +d.Year;
        const rating = +d.Rating;
        const voteStr = d.Votes;
        if (!year || !d.countries_origin || isNaN(rating) || rating < currentMinRating) continue;
        let votes = 0;
        if (voteStr) {
            const cleaned = String(voteStr).trim().toUpperCase();
            if (cleaned.endsWith("K")) votes = parseFloat(cleaned.replace("K", "")) * 1000;
            else if (cleaned.endsWith("M")) votes = parseFloat(cleaned.replace("M", "")) * 1000000;
            else votes = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
        }
        if (isNaN(votes) || votes < currentMinVotes) continue;
        let countries;
        try { countries = JSON.parse(String(d.countries_origin).replace(/'/g, '"'));}
        catch (e) { try { countries = eval(String(d.countries_origin)); } catch (e2) { continue; } }
        if (!Array.isArray(countries)) continue;
        const fixedCountries = countries.map(c => countryNameFixes[c] || c);
        if (!fixedCountries.includes(countryForChart)) continue;
        let revenue = 0;
        if (d.grossWorldWWide) {
            revenue = toUSD(d.grossWorldWWide); 
        }
        const chartAdjustedRevenue = currentInflationSetting ? adjustForInflationAmount(revenue, year) : revenue;
        if (chartAdjustedRevenue > 0) { 
            if (!revenueByYear[year]) revenueByYear[year] = { totalRevenue: 0, count: 0 };
            revenueByYear[year].totalRevenue += chartAdjustedRevenue;
            revenueByYear[year].count += 1;
        }
    }
    const allRevenueData = [];
    for (let yr = 1925; yr <= 2025; yr++) {
        if (revenueByYear[yr] && revenueByYear[yr].count > 0) {
            const dataPoint = { year: yr, count: revenueByYear[yr].count };
            dataPoint.value = currentChartModeForCalc === "total" ? revenueByYear[yr].totalRevenue : revenueByYear[yr].totalRevenue / revenueByYear[yr].count;
            allRevenueData.push(dataPoint);
        }
    }
    const currentMinChartYearRange = useGlobalFilters ? minChartYear : 1925;
    const currentMaxChartYearRange = useGlobalFilters ? maxChartYear : 2025;
    return allRevenueData.filter(d => d.year >= currentMinChartYearRange && d.year <= currentMaxChartYearRange);
}

function updateLineChart(svgId = "line-chart", targetChartG) {
    if (!targetChartG || !targetChartG.node || typeof targetChartG.node !== 'function') { 
        return;
    }
    const container = document.getElementById(targetChartG.node().closest("#line-chart-container, #line-chart-container-journey").id);
    if (!container) { console.warn("Line chart container not found for SVG:", svgId); return; }
    const width = container.clientWidth;
    const height = container.clientHeight || (currentPage === 'journey' ? 450 : 400);
    const innerWidth = width - lineMargin.left - lineMargin.right;
    const innerHeight = height - lineMargin.top - lineMargin.bottom;
    const currentLineSvg = d3.select("#" + svgId);
    currentLineSvg.attr("width", width).attr("height", height); 
    targetChartG.attr("transform", `translate(${lineMargin.left}, ${lineMargin.top})`);
    const currentXScale = d3.scaleLinear().range([0, innerWidth]);
    const currentYScale = d3.scaleLinear().range([innerHeight, 0]);
    const currentXAxis = targetChartG.select(".axis.x-axis").attr("transform", `translate(0, ${innerHeight})`);
    const currentYAxis = targetChartG.select(".axis.y-axis");
    targetChartG.select(".axis-label.x-axis-label").attr("x", innerWidth / 2).attr("y", innerHeight + lineMargin.bottom - 15);
    targetChartG.select(".axis-label.y-axis-label").attr("x", -innerHeight / 2).attr("y", -lineMargin.left + 25);
    targetChartG.select(`#trend-line-clip-${svgId} rect`).attr("width", innerWidth).attr("height", innerHeight);
    let data;
    const currentChartMetric = (currentPage === 'journey') ? 'revenue' : mapMetric; 
    const currentChartDisplayMode = (currentPage === 'journey') ? 'average' : chartMode; 
    const isRatingType = currentChartMetric === "rating";
    data = isRatingType ? calculateRatingData(selectedCountry) : calculateRevenueData(selectedCountry);
    const loadingMessageEl = (currentPage === 'journey') ? container.querySelector('.loading-journey') : null;
    targetChartG.selectAll(".no-data-text").remove();
    if (loadingMessageEl) loadingMessageEl.style.display = 'none';
    if (!data || data.length === 0) {
        targetChartG.select(".line-path").attr("d", "");
        targetChartG.select(".trend-line").attr("d", "");
        targetChartG.select(".dots-group").selectAll(".dot").remove();
        const dataTypeMessage = isRatingType ? (currentChartDisplayMode === "total" ? "movie count" : "average rating") : (currentChartDisplayMode === "total" ? "total revenue" : "average revenue");
        const noDataTextContent = `No ${dataTypeMessage} data for ${selectedCountry}.`;
        if (loadingMessageEl) {
            loadingMessageEl.textContent = noDataTextContent;
            loadingMessageEl.style.display = 'block';
        } else {
            targetChartG.append("text").attr("class", "no-data-text")
                .attr("x", innerWidth / 2).attr("y", innerHeight / 2).attr("text-anchor", "middle")
                .text(noDataTextContent);
        }
        const currentMinRange = (currentPage === 'journey') ? 1925 : minChartYear;
        const currentMaxRange = (currentPage === 'journey') ? 2025 : maxChartYear;
        currentXScale.domain([currentMinRange, currentMaxRange]);
        currentYScale.domain(isRatingType && currentChartDisplayMode === "average" ? [0, 10] : [0, 1]);
        currentXAxis.transition().duration(500).call(d3.axisBottom(currentXScale).tickFormat(d3.format("d")));
        currentYAxis.transition().duration(500).call(d3.axisLeft(currentYScale).ticks(5).tickFormat(isRatingType && currentChartDisplayMode === "average" ? d => d.toFixed(1) : d3.format("~s")));
        targetChartG.select(".grid.x-grid").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(currentXScale).tickSize(-innerHeight).tickFormat(""));
        targetChartG.select(".grid.y-grid").call(d3.axisLeft(currentYScale).tickSize(-innerWidth).tickFormat(""));
        return;
    }
    const valueAccessor = d => d.value; 
    const dataValues = data.map(valueAccessor);
    let yMin = d3.min(dataValues);
    let yMax = d3.max(dataValues);
    const yPadding = (yMax - yMin) * 0.1 || (isRatingType && currentChartDisplayMode === "average" ? 1 : 0.1 * yMax) || 1;
    yMin = Math.max(0, yMin - yPadding);
    yMax = yMax + yPadding;
    if (isRatingType && currentChartDisplayMode === "average") { yMin = Math.max(0, d3.min(dataValues) - 0.5); yMax = Math.min(10, d3.max(dataValues) + 0.5); }
    if (yMin === yMax) { yMin = Math.max(0, yMin - (isRatingType && currentChartDisplayMode === "average" ? 1 : Math.abs(yMin * 0.1) || 1)); yMax = yMax + (isRatingType && currentChartDisplayMode === "average" ? 1 : Math.abs(yMax * 0.1) || 1); }
    currentXScale.domain(d3.extent(data, d => d.year));
    currentYScale.domain([yMin, yMax]);
    currentXAxis.transition().duration(500).call(d3.axisBottom(currentXScale).tickFormat(d3.format("d")));
    currentYAxis.transition().duration(500).call(d3.axisLeft(currentYScale).ticks(Math.min(Math.round(innerHeight/40), 8)).tickFormat(isRatingType ? (currentChartDisplayMode === "total" ? d3.format(",d") : d=>d.toFixed(1)) : d3.format("~s")));
    targetChartG.select(".grid.x-grid").attr("transform", `translate(0,${innerHeight})`).transition().duration(500).call(d3.axisBottom(currentXScale).tickSize(-innerHeight).tickFormat(""));
    targetChartG.select(".grid.y-grid").transition().duration(500).call(d3.axisLeft(currentYScale).tickSize(-innerWidth).tickFormat(""));
    const currentPathGenerator = d3.line()
        .defined(d => valueAccessor(d) != null && !isNaN(valueAccessor(d)))
        .x(d => currentXScale(d.year))
        .y(d => currentYScale(valueAccessor(d)))
        .curve(d3.curveMonotoneX);
    targetChartG.select(".line-path").datum(data).transition().duration(500).attr("d", currentPathGenerator);
    const regression = calculateLinearRegression(data); 
    if (regression && data.length >=2) {
        const xDomain = currentXScale.domain();
        const trendPoints = [ { year: xDomain[0], value: regression.slope * xDomain[0] + regression.intercept }, { year: xDomain[1], value: regression.slope * xDomain[1] + regression.intercept } ];
        trendPoints.forEach(p => { if (currentYScale.domain()[0] >= 0) p.value = Math.max(0, p.value); });
        const currentTrendGenerator = d3.line()
            .x(d => currentXScale(d.year))
            .y(d => currentYScale(d.value));
        targetChartG.select(".trend-line").datum(trendPoints).transition().duration(500).attr("d", currentTrendGenerator);
    } else {
        targetChartG.select(".trend-line").attr("d", "");
    }
    const dots = targetChartG.select(".dots-group").selectAll(".dot").data(data, d => d.year);
    dots.exit().transition().duration(250).attr("r", 0).remove();
    dots.enter().append("circle").attr("class", "dot")
        .merge(dots)
        .on("mouseover", function(d_dot) { // For D3 v5, d_dot is the data, event is d3.event
            const event = d3.event; 
            const tooltipEl = document.querySelector('.tooltip'); 
            if (!tooltipEl && currentPage !== 'journey') return; 
            let valueDisplay, valueLabel, countDisplay = d_dot.count.toLocaleString();
            if (isRatingType) {
                valueDisplay = d_dot.value.toFixed(2); valueLabel = currentChartDisplayMode === "total" ? "Movies" : "Avg Rating";
                if (currentChartDisplayMode === "total") valueDisplay = d_dot.value.toLocaleString();
            } else {
                const val = d_dot.value; 
                valueDisplay = fmtMoney(val); 
                valueLabel = currentChartDisplayMode === "total" ? (adjustForInflation ? "Total Revenue (2025$)" : "Total Revenue") : (adjustForInflation ? "Avg Revenue (2025$)" : "Avg Revenue");
            }
            if (tooltipEl && currentPage === 'full_dashboard') { 
                tooltipEl.innerHTML = `<strong>${d_dot.year}</strong><br><div class="tooltip-row">${valueLabel}: ${valueDisplay}</div><div class="tooltip-row">Movies: ${countDisplay}</div>`;
                tooltipEl.style.opacity = 0.95;
                tooltipEl.style.left = (event.pageX + 10) + "px";
                tooltipEl.style.top = (event.pageY - 28) + "px";
            }
            d3.select(this).transition().duration(100).attr("r", 6);
        })
        .on("mouseout", function() {
            const tooltipEl = document.querySelector('.tooltip');
            if (tooltipEl && currentPage === 'full_dashboard') tooltipEl.style.opacity = 0;
            d3.select(this).transition().duration(100).attr("r", 4);
        })
        .transition().duration(500)
        .attr("cx", d => currentXScale(d.year))
        .attr("cy", d => currentYScale(valueAccessor(d)))
        .attr("r", 4).attr("fill", "#82aaff").attr("stroke", "#0f0f23").attr("stroke-width", 1.5); 
}

// --- USER-PROVIDED SCATTER PLOT FUNCTIONS (ADAPTED FOR DARK THEME) ---
// function to draw a scatter plot of budget vs revenue
function updateHighBudgetScatter() {
  // stop if the movie data hasn't loaded yet
  if (!combined_movies_data) {
    // console.warn("Combined movie data not available for scatter plot.");
    return;
  }

    const yearLabel = document.getElementById("budget-year-label");
  // get the selected year and update the label on the page
  if (yearLabel) { // Ensure the label element exists
       yearLabel.textContent = `(${selectedYear})`;
    }


  // create an array to hold movie info for the scatter plot
  var movies = [];
  for (var i = 0; i < combined_movies_data.length; i++) {
    var d_movie_loop = combined_movies_data[i]; // Renamed to avoid conflict

    // skip this movie if it's not from the selected year
    if (parseInt(d_movie_loop.Year, 10) !== selectedYear) {
      continue;
    }

    // converty budget and revenue to numbers in usd
    var budget = toUSD(d_movie_loop.budget);
    var revenue = toUSD(d_movie_loop.grossWorldWWide);
    var rating = parseFloat(d_movie_loop.Rating);

    // skip movied with missing/invalid numbers
    if (budget <= 0 || revenue <= 0 || isNaN(rating)) {
      continue;
    }

    // save cleaned up movies for later
    movies.push({
      Title: d_movie_loop.Title,
      BudgetUSD: budget,
      RevenueUSD: revenue,
      Rating: rating.toFixed(1), // Already formatted to 1 decimal place
      Country: (d_movie_loop.countries_origin ? cleanArray(d_movie_loop.countries_origin) : "N/A"), // Use cleanArray
      Description: d_movie_loop.description ? d_movie_loop.description : "",
      Stars: cleanArray(d_movie_loop.stars),
      Writers: cleanArray(d_movie_loop.writers),
      Directors: cleanArray(d_movie_loop.directors),
      Genres: cleanArray(d_movie_loop.genres),
      Languages: cleanArray(d_movie_loop.Languages)
    });
  }

  // sort movies by biggest mudget and keep only top 25
  movies.sort(function(a, b) {
    return b.BudgetUSD - a.BudgetUSD;
  });
  movies = movies.slice(0, 25);

  // set up the chart container size
  var container = document.getElementById("scatter-container");
    if (!container) {
        console.warn("Scatter plot container #scatter-container not found during update.");
        return;
    }
  var fullWidth = container.clientWidth;
  var margin = { top: 40, right: 40, bottom: 60, left: 80 };
  var width = fullWidth - margin.left - margin.right;
  var height = 500 - margin.top - margin.bottom; // SVG height is 500

  // only set up the chart once, or if it needs re-initialization (e.g. after resize)
  if (!scatterSvg || scatterSvg.empty()) {
        const scatterPlotSVGEl = d3.select("#scatter-plot");
        if (scatterPlotSVGEl.empty()){
            console.warn("SVG element #scatter-plot not found in HTML for scatter plot.");
            return;
        }
    scatterSvg = scatterPlotSVGEl
      .attr("width", fullWidth)
      .attr("height", 500);
        
        scatterSvg.selectAll("*").remove(); // Clear previous content

    scatterView = scatterSvg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    scatterSvg.append("defs")
      .append("clipPath")
      .attr("id", "scatter-clip")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height);

    scatterView.append("rect")
      .attr("class", "bg-rect-scatter") // More specific class
      .attr("fill", "transparent") // Dark theme: transparent background
      .attr("width", width)
      .attr("height", height);

    dotsScatter = scatterView.append("g").attr("class", "dots-scatter") // Specific class
      .attr("class", "dots-scatter")
      .attr("clip-path", "url(#scatter-clip)");
    xAxisScatterG = scatterView.append("g").attr("class", "x-axis scatter-axis"); // Specific class
    yAxisScatterG = scatterView.append("g").attr("class", "y-axis scatter-axis"); // Specific class

    scatterView.append("text")
      .attr("class", "x-label scatter-label")  // Specific class
            .attr("text-anchor", "middle")
            .attr("x", width / 2) // Centered within the innerWidth
      .attr("y", height + margin.bottom - 15) // Adjusted position
      .style("font-size", "12px") // Consistent style
      .style("fill", "#e0e0e0") // Dark theme color
      .text("Budget (USD)");

    scatterView.append("text")
      .attr("class", "y-axis-label scatter-label") // Specific class
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 25) // Adjusted for better positioning
      .style("font-size", "12px")
      .style("fill", "#e0e0e0"); // Text set dynamically

    scatterZoom = d3.zoom()
      .scaleExtent([0.5, 10])
      .translateExtent([[-width, -height], [2 * width, 2 * height]])
      .on("zoom", zoomed); // zoomed is defined below

    scatterSvg.call(scatterZoom);
  } else { // If SVG exists, update its size and positions of static elements
      scatterSvg.attr("width", fullWidth);
      scatterView.select(".bg-rect-scatter").attr("width", width).attr("height", height);
      scatterView.select(".x-label.scatter-label").attr("x", width / 2).attr("y", height + margin.bottom - 15);
      scatterView.select(".y-axis-label.scatter-label").attr("x", -height/2).attr("y", -margin.left + 25);
      xAxisScatterG.attr("transform", "translate(0," + height + ")"); // Make sure x-axis is at the bottom
    }

    // This internal 'zoomed' function is specific to updateHighBudgetScatter
    function zoomed() {
        if (!d3.event || !d3.event.transform) return; // D3 v5 event check
        var t = d3.event.transform;
        var zx = t.rescaleX(xScatter); // xScatter is the scale for this plot
        var zy = t.rescaleY(yScatter); // yScatter is the scale for this plot
        
        xAxisScatterG.call(d3.axisBottom(zx).tickFormat(fmtMoney).tickSizeOuter(0))
            .selectAll("text").style("fill", "#a0a0b0").style("font-size", "10px");
        xAxisScatterG.select(".domain").style("stroke", "#718096");


        yAxisScatterG.call(showProfitRatio ? d3.axisLeft(zy).ticks(6).tickSizeOuter(0) : d3.axisLeft(zy).tickFormat(fmtMoney).tickSizeOuter(0))
            .selectAll("text").style("fill", "#a0a0b0").style("font-size", "10px");
        yAxisScatterG.select(".domain").style("stroke", "#718096");


        dotsScatter.selectAll("circle")
            .attr("cx", function(d_circle) { return zx(d_circle.BudgetUSD); })
            .attr("cy", function(d_circle) { return zy(yValue(d_circle)); }); // yValue is defined below
    }

  // set up x axis scale to use movie budgets using scaleLinear
  xScatter = d3.scaleLinear()
    .domain([0, d3.max(movies, function(d_movie) { return d_movie.BudgetUSD; }) * 1.1 || 1]) // Ensure domain max is at least 1 if no movies
    .range([0, width])
    .nice();

  // decide what to show on y axis, either revenue or ratio
  var yValue = function(d_movie) {
    if (showProfitRatio) {
      return d_movie.BudgetUSD > 0 ? d_movie.RevenueUSD / d_movie.BudgetUSD : 0;
    } else {
      return d_movie.RevenueUSD;
    }
  };

  // set up the y axis scale using scaleLinear
  yScatter = d3.scaleLinear()
    .domain([0, d3.max(movies, function(d_movie) { return yValue(d_movie); }) * 1.1 || 1]) // Ensure domain max is at least 1
    .range([height, 0])
    .nice();

    // Clear previous no-data message if any, before drawing new axes/dots
    scatterView.selectAll(".no-data-scatter-text").remove();

    if (movies.length === 0) {
        scatterView.append("text")
            .attr("class", "no-data-scatter-text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .style("fill", "#a0a0b0") // Dark theme text color
            .text(`No movie data for ${selectedYear} with current filters.`);
        // Clear axes if no data, or set to default domains
        xAxisScatterG.selectAll("*").remove();
        yAxisScatterG.selectAll("*").remove();
    } else {
      // axis formatting
      var xAxisFormat = d3.axisBottom(xScatter).tickFormat(fmtMoney).tickSizeOuter(0);
      var yAxisFormat = showProfitRatio ? d3.axisLeft(yScatter).ticks(6).tickSizeOuter(0) : d3.axisLeft(yScatter).tickFormat(fmtMoney).tickSizeOuter(0);
     
      // draw x and y axis
      xAxisScatterG
        .attr("transform", "translate(0," + height + ")") // Make sure x-axis is at the bottom
        .transition().duration(500)
        .call(xAxisFormat)
            .selectAll("text") // Style axis text for dark theme
                .style("fill", "#a0a0b0")
                .style("font-size", "10px");
        xAxisScatterG.select(".domain").style("stroke", "#718096"); // Style axis line


      yAxisScatterG
        .transition().duration(500)
        .call(yAxisFormat)
            .selectAll("text") // Style axis text for dark theme
                .style("fill", "#a0a0b0")
                .style("font-size", "10px");
        yAxisScatterG.select(".domain").style("stroke", "#718096"); // Style axis line

    }
  // update the label potition/text
  scatterView.select(".y-axis-label.scatter-label").text(showProfitRatio ? "Revenue ÷ Budget Ratio" : "Revenue (USD)");

  // set the movie data to the dots in the chart
  var dots = dotsScatter.selectAll("circle").data(movies, function(d_movie) { return d_movie.Title + d_movie.Year; }); // Using a more unique key

  // remove old dots
  dots.exit()
    .transition().duration(300)
    .attr("r", 0)
    .remove();

  // add new dots for new data
  dots.enter()
    .append("circle")
    .attr("r", 0) // Start with radius 0 for entry animation
    .attr("fill", "#82aaff") // Consistent dot color for dark theme
    .attr("stroke", "#0f0f23") // Dark theme stroke, matching line chart dots
    .attr("stroke-width", 1.5)
        // Set initial positions for entering dots before transition
        .attr("cx", function(d_movie) { return xScatter(d_movie.BudgetUSD); }) 
        .attr("cy", function(d_movie) { return yScatter(yValue(d_movie)); })
    .on("mouseover", function(d_movie) { // D3 v5 event handling: d_movie is the data
      const event = d3.event; // Access event object
      const tooltipEl = d3.select("#movie-tooltip");
      tooltipEl.html(
        "<strong>" + d_movie.Title + "</strong><br>" +
        "<div><strong>Country:</strong> " + (d_movie.Country || "N/A") + "</div>" +
        "<div><strong>Rating:</strong> " + d_movie.Rating + "</div>" + // Rating is already string "X.Y"
        "<div><strong>Budget:</strong> " + fmtMoney(d_movie.BudgetUSD) + "</div>" +
        "<div><strong>Revenue:</strong> " + fmtMoney(d_movie.RevenueUSD) + "</div>" +
        (showProfitRatio ? "<div><strong>Revenue ÷ Budget:</strong> " + (d_movie.BudgetUSD > 0 ? (d_movie.RevenueUSD / d_movie.BudgetUSD).toFixed(2) : "N/A") + "</div>" : "")
      )
      .style("left", (event.pageX + 12) + "px")
      .style("top", (event.pageY - 28) + "px") // Position tooltip above cursor
      .style("opacity", 0.95);
            d3.select(this).transition().duration(100).attr("r", 8); // Enlarge dot
    })
    .on("mousemove", function() { // d3.event is available here in v5
      const event = d3.event;
      d3.select("#movie-tooltip")
      .style("left", (event.pageX + 12) + "px")
      .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() { // d3.event is available here in v5
      d3.select("#movie-tooltip").style("opacity", 0);
            d3.select(this).transition().duration(100).attr("r", 6); // Reset dot size
    })
        .merge(dots) // Merge enter and update selections for transitions
    .transition().duration(500)
    .attr("cx", function(d_movie) { return xScatter(d_movie.BudgetUSD); })
    .attr("cy", function(d_movie) { return yScatter(yValue(d_movie)); })
    .attr("r", 6); // Final radius
}

function resetScatterZoom() {
  const svg = d3.select("#scatter-plot"); // Refers to the SVG for the scatter plot
  if (!svg.empty() && scatterZoom) { // Check if svg selection is not empty and scatterZoom is defined
    svg.transition()
      .duration(750)
      .call(scatterZoom.transform, d3.zoomIdentity);
  }
}


// --- EVENT LISTENERS & OTHER UI FUNCTIONS ---
function setupDashboardControlsEventListeners() {
    if (currentPage !== 'full_dashboard') return;

    const yearSliderEl = document.getElementById('year-slider');
    const yearValueEl = document.getElementById('year-value');
    const ratingSliderEl = document.getElementById('rating-slider');
    const ratingValueEl = document.getElementById('rating-value');
    const votesSliderEl = document.getElementById('votes-slider');
    const votesValueEl = document.getElementById('votes-value');
    const metricRadiosEl = document.querySelectorAll('input[name="map-metric"]');
    const resetBtnEl = document.getElementById('reset-btn');
    const resetZoomBtnEl = document.getElementById('reset-zoom-btn'); // For map
    const inflationButtonEl = document.getElementById('inflation-btn');
    const chartModeButtonEl = document.getElementById('chart-mode-btn');
    const minChartYearSliderEl = document.getElementById('min-year-slider');
    const minChartYearValueEl = document.getElementById('min-year-value');
    const maxChartYearSliderEl = document.getElementById('max-year-slider');
    const maxChartYearValueEl = document.getElementById('max-year-value');
    
    const scatterResetBtnEl = document.getElementById('scatter-reset-btn');
    const profitRatioToggleEl = document.getElementById('toggle-profit-ratio');

    if (yearSliderEl) yearSliderEl.addEventListener('input', function() {
        selectedYear = +this.value;
        if (yearValueEl) yearValueEl.textContent = selectedYear;
        updateMapVisualization(); 
        updateDashboardStatistics(movieCountsByYear[selectedYear] || {}); 
        updateHighBudgetScatter(); 
    });

    if (ratingSliderEl) ratingSliderEl.addEventListener('input', function() {
        minRating = +this.value;
        if (ratingValueEl) ratingValueEl.textContent = minRating.toFixed(1);
        processMovieData(); 
    });

    if (votesSliderEl) votesSliderEl.addEventListener('input', function() {
        minVotes = +this.value;
        if (votesValueEl) votesValueEl.textContent = minVotes.toLocaleString();
        processMovieData(); 
    });

    if (metricRadiosEl) metricRadiosEl.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                mapMetric = this.value; 
                updateMapVisualization(); 
                const dashboardChartG = d3.select("#line-chart").select("g");
                 if(!dashboardChartG.empty()) {
                    updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
                    updateLineChart('line-chart', dashboardChartG);
                }
            }
        });
    });

    if (resetBtnEl) resetBtnEl.addEventListener('click', function() {
        selectedYear = 2024; minRating = 7; minVotes = 10000; mapMetric = "count";
        selectedCountry = "United States of America"; 
        adjustForInflation = false; 
        chartMode = "average"; 
        minChartYear = 1925; 
        maxChartYear = 2024;
        showProfitRatio = false; 

        if (yearSliderEl) yearSliderEl.value = selectedYear; if (yearValueEl) yearValueEl.textContent = selectedYear;
        if (ratingSliderEl) ratingSliderEl.value = minRating; if (ratingValueEl) ratingValueEl.textContent = minRating.toFixed(1);
        if (votesSliderEl) votesSliderEl.value = minVotes; if (votesValueEl) votesValueEl.textContent = minVotes.toLocaleString();
        const metricCountRadio = document.getElementById('metric-count');
        if (metricCountRadio) metricCountRadio.checked = true;
        if (inflationButtonEl) {
            inflationButtonEl.textContent = 'Adjust for Inflation';
            inflationButtonEl.classList.remove('active');
        }
        if (chartModeButtonEl) {
             chartModeButtonEl.textContent = (mapMetric === "rating" && chartMode === "average") ? 'Movie Count per Year' : 
                                           (mapMetric === "rating" && chartMode === "total") ? 'Avg Rating per Year' :
                                           (mapMetric !== "rating" && chartMode === "average") ? 'Total Revenue per Year' : 
                                           'Avg Revenue per Movie';
             if (chartMode === "average") chartModeButtonEl.classList.remove('active'); else chartModeButtonEl.classList.add('active');
        }
        if (minChartYearSliderEl) {
            minChartYearSliderEl.value = minChartYear;
            if(minChartYearValueEl) minChartYearValueEl.textContent = minChartYear;
        }
        if (maxChartYearSliderEl) { 
            maxChartYearSliderEl.value = maxChartYear; 
            if(maxChartYearValueEl) maxChartYearValueEl.textContent = maxChartYear;
        }
        if (profitRatioToggleEl) profitRatioToggleEl.checked = false;
        
        processMovieData(); 
        resetMapZoom(); 
        resetScatterZoom();
        
        const selectedCountryEl = document.getElementById('selected-country');
        if(selectedCountryEl) selectedCountryEl.textContent = selectedCountry; 
         const dashboardChartG = d3.select("#line-chart").select("g");
            if(!dashboardChartG.empty()) {
                updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
            }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (resetZoomBtnEl) resetZoomBtnEl.addEventListener('click', resetMapZoom);

    if (scatterResetBtnEl) { // Listener for scatter plot reset button
        scatterResetBtnEl.addEventListener("click", resetScatterZoom);
    }
    if (profitRatioToggleEl) { // Listener for profit ratio toggle
        profitRatioToggleEl.addEventListener("change", function (e) {
            showProfitRatio = e.target.checked;
            updateHighBudgetScatter(); 
        });
    }

    if (inflationButtonEl) inflationButtonEl.addEventListener('click', function() {
        adjustForInflation = !adjustForInflation;
        this.textContent = adjustForInflation ? '2025 Dollars (ON)' : 'Adjust for Inflation';
        this.classList.toggle('active', adjustForInflation); 
        processMovieData(); 
    });

    if (chartModeButtonEl) chartModeButtonEl.addEventListener('click', function() {
        chartMode = chartMode === "average" ? "total" : "average";
        // Update button text based on current mapMetric and new chartMode
        if (mapMetric === "rating") {
            this.textContent = chartMode === "total" ? 'Avg Rating per Year' : 'Movie Count per Year';
        } else { // Revenue
            this.textContent = chartMode === "total" ? 'Avg Revenue per Movie' : 'Total Revenue per Year';
        }
        this.classList.toggle('active', chartMode === "total");

        const dashboardChartG = d3.select("#line-chart").select("g");
        if(!dashboardChartG.empty()) {
            updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
            updateLineChart('line-chart', dashboardChartG);
        }
    });

    if (minChartYearSliderEl) minChartYearSliderEl.addEventListener('input', function() {
        minChartYear = +this.value;
        if (minChartYear > maxChartYear) { 
            maxChartYear = minChartYear;
            if (maxChartYearSliderEl) maxChartYearSliderEl.value = maxChartYear; 
            if (maxChartYearValueEl) maxChartYearValueEl.textContent = maxChartYear;
        }
        if (minChartYearValueEl) minChartYearValueEl.textContent = minChartYear;
        const dashboardChartG = d3.select("#line-chart").select("g");
        if(!dashboardChartG.empty()) updateLineChart('line-chart', dashboardChartG);
    });

    if (maxChartYearSliderEl) maxChartYearSliderEl.addEventListener('input', function() { 
        maxChartYear = +this.value;
        if (maxChartYear < minChartYear) { 
            minChartYear = maxChartYear;
            if (minChartYearSliderEl) minChartYearSliderEl.value = minChartYear;
            if (minChartYearValueEl) minChartYearValueEl.textContent = minChartYear;
        }
        if (maxChartYearValueEl) maxChartYearValueEl.textContent = maxChartYear;
        const dashboardChartG = d3.select("#line-chart").select("g");
        if(!dashboardChartG.empty()) updateLineChart('line-chart', dashboardChartG);
    });
}

function updateDashboardStatistics(dataForYear) {
    if (currentPage !== 'full_dashboard') return;
    const totalMoviesEl = document.getElementById('total-movies');
    const totalCountriesEl = document.getElementById('total-countries');
    const avgRatingEl = document.getElementById('avg-rating');
    const totalRevenueEl = document.getElementById('total-revenue');
    const totalRevenueLabelEl = totalRevenueEl ? totalRevenueEl.parentElement.querySelector('.stat-label') : null;
    if (!totalMoviesEl || !totalCountriesEl || !avgRatingEl || !totalRevenueEl || !totalRevenueLabelEl) {
        return;
    }
    const countriesWithData = Object.keys(dataForYear);
    const totalMovies = d3.sum(Object.values(dataForYear), d => d.count || 0);
    const totalRevenueValue = d3.sum(Object.values(dataForYear), d => d.revenue || 0); 
    let totalRatingSum = 0, totalRatingCount = 0;
    Object.values(dataForYear).forEach(d => { totalRatingSum += d.ratingSum || 0; totalRatingCount += d.ratingCount || 0; });
    const avgRatingValue = totalRatingCount > 0 ? totalRatingSum / totalRatingCount : 0;
    totalMoviesEl.textContent = totalMovies.toLocaleString();
    totalCountriesEl.textContent = countriesWithData.length;
    avgRatingEl.textContent = avgRatingValue.toFixed(1);
    const revenueText = totalRevenueValue > 0 ? 
        fmtMoney(totalRevenueValue) : 
        (totalMovies > 0 && Object.values(dataForYear).some(d => d.revenue !== undefined) ? '$0' : 'N/A'); 
    totalRevenueEl.textContent = revenueText;
    totalRevenueLabelEl.textContent = adjustForInflation ? 'Total Revenue (2025 $)' : 'Total Revenue';
}


window.addEventListener('resize', debounce(() => {
    if ((currentPage === 'full_dashboard') && svgMap) {
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            const width = mapContainer.clientWidth;
            const height = mapContainer.clientHeight || 600; 
            svgMap.attr("width", width).attr("height", height);
            projectionMap.scale(Math.min(width / 6.2, height / 3.6)).translate([width / 2, height / 1.75]);
            gMap.selectAll("path.country").attr("d", pathMap);
            if (legendGroupMap) legendGroupMap.attr("transform", `translate(20, ${height - 70})`);
        }
    }
    if (currentPage === 'journey') {
        const journeyContainer = document.getElementById('line-chart-container-journey');
        const journeySVG = document.getElementById('line-chart-journey');
        if(journeyContainer && journeySVG && !d3.select("#line-chart-journey").select("g").empty()){ 
            const journeyChartG = createLineChart('line-chart-container-journey', 'line-chart-journey'); 
            if(journeyChartG){
                updateChartTitleAndLabels('chart-title-journey', 'selected-country-journey', journeyChartG);
                updateLineChart('line-chart-journey', journeyChartG);
            }
        }
    }
    if (currentPage === 'full_dashboard') {
        const dashboardContainer = document.getElementById('line-chart-container');
        const dashboardSVG = document.getElementById('line-chart');
         if(dashboardContainer && dashboardSVG && !d3.select("#line-chart").select("g").empty()){
            const dashboardChartG = createLineChart('line-chart-container', 'line-chart'); 
            if(dashboardChartG){
                updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
                updateLineChart('line-chart', dashboardChartG);
            }
        }
        updateHighBudgetScatter(); 
    }
}, 250));