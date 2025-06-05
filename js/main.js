// Global variables
let combined_movies_data = null;
let customGeoJSON = null;
let movieCountsByYear = {};
let selectedCountry = "United States of America"; // Default selected country

// Filter state (defaults, can be overridden by page-specific logic or controls)
let selectedYear = 2025;
let minRating = 7;
let minVotes = 10000;
let mapMetric = "count"; // "count" or "rating"
let adjustForInflation = false;
let chartMode = "average"; // "average" or "total"
let minChartYear = 1925;
let maxChartYear = 2025;

// D3 selections for map (initialized in createMap)
let svgMap, gMap, projectionMap, pathMap, zoomMap, legendGroupMap;
// D3 selections for line chart (initialized in createLineChart)
let lineChartSvg, lineChartG, lineX, lineY, linePathGenerator, trendLineGenerator, xAxisLine, yAxisLine;

// Page identifier
let currentPage = null; // 'dashboard' or 'journey'

// Historical CPI data (remains the same)
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

// Country name fixes 
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

// Utility functions 
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

// Data loading and initial setup
document.addEventListener('DOMContentLoaded', () => {
    // Determine current page based on unique element IDs
    if (document.getElementById('map-container') && !document.getElementById('line-chart-container-journey')) {
        currentPage = 'dashboard';
    } else if (document.getElementById('line-chart-container-journey') && !document.getElementById('map-container')) {
        currentPage = 'journey';
    } else if (document.getElementById('map-container') && document.getElementById('line-chart-container')) {
        currentPage = 'full_dashboard'; // For the new scenario where dashboard has map AND its own line chart
    }
     else {
        console.warn("Page type undetermined or conflicting/missing containers found.");
        // Potentially set currentPage to a default or error state if needed
        return; // Stop further execution if page type isn't clear
    }

    console.log("Current page determined as:", currentPage);

    Promise.all([
        d3.csv(currentPage === 'journey' ? "../data/combined_movies_data.csv" : "data/combined_movies_data.csv"), 
        d3.json(currentPage === 'journey' ? "../data/custom.geo.json" : "data/custom.geo.json")
    ]).then(([movieData, geoData]) => {
        combined_movies_data = movieData;
        customGeoJSON = geoData;
        processMovieData(); 

        if (currentPage === 'dashboard') { // Only Map
            initializeFullDashboardPage(); 
        } else if (currentPage === 'journey') { // Only Journey Line Chart
            initializeJourneyPageLineChart();
        } else if (currentPage === 'full_dashboard') { // Map + Dashboard Line Chart
            initializeFullDashboardPage();
        }

    }).catch(error => {
        console.error("Error loading data:", error);
        if (document.getElementById('map-container')) {
            document.getElementById('map-container').innerHTML = 
                `<div style="text-align: center; padding: 2rem; color: #dc3545;">Error loading data. Check console and data paths.</div>`;
        }
        if (document.getElementById('line-chart-container-journey')) {
            const loadingEl = document.getElementById('line-chart-container-journey').querySelector('.loading-journey');
            if(loadingEl) loadingEl.textContent = 'Error loading chart data.';
        }
        if (document.getElementById('line-chart-container')) { // For full_dashboard
             const loadingEl = document.getElementById('line-chart-container').querySelector('.loading'); 
             if(loadingEl) loadingEl.textContent = 'Error loading chart data.';
             else document.getElementById('line-chart-container').innerHTML = `<div style="text-align: center; padding: 2rem; color: #dc3545;">Error loading chart data.</div>`;
        }
    });
});


// --- INITIALIZATION FUNCTIONS PER PAGE ---
function initializeDashboardPageOnlyMap() { // For dashboard.html with map only
    console.log("Initializing Dashboard Page (Map Only)");
    createMap();
    updateMapVisualization(); 
    setupDashboardControlsEventListeners(); 
    updateDashboardStatistics(movieCountsByYear[selectedYear] || {}); 
}

function initializeFullDashboardPage() { // For dashboard.html with map AND its own line chart
    console.log("Initializing Full Dashboard Page (Map & Line Chart)");
    // Initialize Map
    createMap();
    updateMapVisualization();
    
    // Initialize Dashboard's Line Chart
    // Use original IDs for the dashboard's line chart
    const dashboardChartG = createLineChart('line-chart-container', 'line-chart'); 
    if (dashboardChartG) {
        updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
        updateLineChart('line-chart', dashboardChartG);
    }
    
    // Setup all controls for this page
    setupDashboardControlsEventListeners(); // This needs to handle map AND line chart controls
    updateDashboardStatistics(movieCountsByYear[selectedYear] || {}); 
}


function initializeJourneyPageLineChart() { // For index.html (narrative with line chart)
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
        updateLineChart('line-chart-journey', journeyChartG);
    }
}

// --- DATA PROCESSING ---
function processMovieData() {
    // This function remains largely the same
    movieCountsByYear = {};
    if (!combined_movies_data) return;

    const currentMinRating = (currentPage === 'journey') ? 0 : minRating;
    const currentMinVotes = (currentPage === 'journey') ? 0 : minVotes;
    // Global adjustForInflation is used here for movieCountsByYear storage
    // Specific chart instances might override this for display if needed, but data processing is global

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

        let revenue = 0;
        if (revenueStr) {
            revenue = parseFloat(String(revenueStr).replace(/[^0-9.]/g, "")) || 0;
        }
        const processedRevenue = adjustForInflationAmount(revenue, year); // Use global adjustForInflation


        let countries;
        try {
            countries = JSON.parse(d.countries_origin.replace(/'/g, '"'));
        } catch (e) { try { countries = eval(d.countries_origin); } catch (e2) { continue; } }
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
}


// --- MAP SPECIFIC FUNCTIONS ---
function createMap() {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) { console.warn("Map container not found for createMap."); return; }
    
    // Clear previous content (e.g., loading spinner)
    const loadingEl = mapContainer.querySelector('.loading');
    if (loadingEl) loadingEl.style.display = 'none';
    // Ensure SVG is only created once or cleared properly if re-calling createMap
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
    if (!svgMap || !customGeoJSON || !movieCountsByYear) {
        console.warn("Map not ready for updateVisualization");
        return;
    }
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
    const height = mapContainer ? mapContainer.clientHeight : 600;

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

function handleMapMouseOver(d) {
    // This function should only run if map is on the current page
    if (currentPage !== 'dashboard' && currentPage !== 'full_dashboard') return;
    d3.select(this).transition().duration(100)
        .attr("stroke-width", 1.5) 
        .attr("stroke", "#82aaff"); 
}

function handleMapMouseMove(d) { 
    if (currentPage !== 'dashboard' && currentPage !== 'full_dashboard') return;
    const tooltipEl = document.querySelector('.tooltip'); 
    if (!tooltipEl || !movieCountsByYear) return;

    const dataForYear = movieCountsByYear[selectedYear] || {};
    const countryData = dataForYear[d.properties.name];
    const totalMoviesInYear = d3.sum(Object.values(dataForYear), item => item.count || 0);
    let content = `<strong>${d.properties.name}</strong><br>`;
    if (!countryData) {
        content += '<div class="tooltip-row">No data for current filters</div>';
    } else {
        const { count, revenue, ratingSum, ratingCount } = countryData;
        const percentOfTotal = totalMoviesInYear > 0 ? ((count / totalMoviesInYear) * 100).toFixed(1) : "0.0";
        const avgRatingDisplay = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : "N/A";
        let revenueDisplay = "N/A";
        if (revenue > 0) { 
            revenueDisplay = revenue >= 1e9 ? `$${(revenue / 1e9).toFixed(1)}B`
                           : revenue >= 1e6 ? `$${(revenue / 1e6).toFixed(1)}M`
                           : `$${revenue.toLocaleString()}`;
        } else if (revenue === 0 && count > 0) revenueDisplay = "$0";
        const revenueLabelText = adjustForInflation ? "Revenue (2025 $)" : "Revenue";
        content += `<div class="tooltip-row">Movies: ${count} (${percentOfTotal}%)</div>`;
        content += `<div class="tooltip-row">${revenueLabelText}: ${revenueDisplay}</div>`;
        content += `<div class="tooltip-row">Avg IMDb Rating: ${avgRatingDisplay}</div>`;
    }
    tooltipEl.innerHTML = content;
    tooltipEl.style.opacity = 0.95; 
    if (d3.event) { 
        tooltipEl.style.left = (d3.event.pageX) + "px"; 
        tooltipEl.style.top = (d3.event.pageY) + "px";
    }
}

function handleMapMouseOut() {
    if (currentPage !== 'dashboard' && currentPage !== 'full_dashboard') return;
    d3.select(this).transition().duration(100)
        .attr("stroke-width", 0.5)
        .attr("stroke", "#4A5568"); 
    const tooltipEl = document.querySelector('.tooltip');
    if (tooltipEl) tooltipEl.style.opacity = 0;
}

function handleMapCountryClick(d) {
    if (currentPage !== 'dashboard' && currentPage !== 'full_dashboard') return;
    selectedCountry = d.properties.name; 
    console.log("Map selected country on dashboard:", selectedCountry);

    if (currentPage === 'full_dashboard') { // Only update line chart if it's on the same page
        const dashboardChartG = d3.select("#line-chart").select("g"); // Get the G element for dashboard chart
        if (!dashboardChartG.empty()) {
             updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
             updateLineChart('line-chart', dashboardChartG);
        } else {
            console.warn("Dashboard line chart 'g' element not found for update.");
        }
         // Smooth scroll to line chart if it exists on this page
        const lineChartSection = document.querySelector('#line-chart-container');
        if(lineChartSection) {
            const vizContainer = lineChartSection.closest('.viz-container');
            if(vizContainer) vizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
}

// --- LINE CHART SPECIFIC FUNCTIONS ---
// lineMargin definition is now global
const lineMargin = {top: 30, right: 40, bottom: 60, left: 90};

// createLineChart returns the main 'g' element for easier targeting
function createLineChart(containerId = "line-chart-container", svgId = "line-chart") {
    const container = document.getElementById(containerId);
    if (!container) { console.warn(`Line chart container #${containerId} not found.`); return null; }
    
    const svgElement = document.getElementById(svgId);
    if (!svgElement) { console.warn(`Line chart SVG element #${svgId} not found.`); return null; }

    const width = container.clientWidth;
    const height = container.clientHeight || (currentPage === 'journey' ? 450 : 400); 
    
    // Store the current lineChartSvg and lineChartG locally for this instance
    const currentLineChartSvg = d3.select("#" + svgId) 
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "transparent"); 

    const innerWidth = width - lineMargin.left - lineMargin.right;
    const innerHeight = height - lineMargin.top - lineMargin.bottom;
    
    currentLineChartSvg.selectAll("*").remove(); 

    const currentLineChartG = currentLineChartSvg.append("g")
        .attr("transform", `translate(${lineMargin.left}, ${lineMargin.top})`);
    
    // Use local scales for this chart instance
    const currentLineX = d3.scaleLinear().range([0, innerWidth]);
    const currentLineY = d3.scaleLinear().range([innerHeight, 0]);
    
    currentLineChartG.append("g").attr("class", "grid x-grid");
    currentLineChartG.append("g").attr("class", "grid y-grid");

    // Store axis selections locally too
    const currentXAxisLine = currentLineChartG.append("g").attr("class", "axis x-axis").attr("transform", `translate(0, ${innerHeight})`);
    const currentYAxisLine = currentLineChartG.append("g").attr("class", "axis y-axis");
    
    currentLineChartG.append("text").attr("class", "axis-label x-axis-label")
        .attr("text-anchor", "middle").attr("x", innerWidth / 2).attr("y", innerHeight + lineMargin.bottom - 15).text("Year");
    
    currentLineChartG.append("text").attr("class", "axis-label y-axis-label") 
        .attr("text-anchor", "middle").attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2).attr("y", -lineMargin.left + 25).text("Value"); 
    
    // Store generators if they are instance-specific, or they can be global if structure is same
    // For now, making them local to where they are used or passed around.
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
    // Return the main 'g' element so it can be passed to update functions
    return currentLineChartG; 
}


// updateChartTitleAndLabels now accepts the target 'g' element for the chart
function updateChartTitleAndLabels(titleId = "chart-title", countryDisplayId = "selected-country", targetChartG) {
    const chartTitleEl = document.getElementById(titleId);
    const selectedCountryEl = document.getElementById(countryDisplayId);

    if (selectedCountryEl) selectedCountryEl.textContent = selectedCountry; 

    let titleText = "";
    let yAxisLabelText = "";
    
    // Determine metric and mode based on current page or global state for dashboard
    const currentMetric = (currentPage === 'journey') ? 'revenue' : mapMetric; 
    const currentMode = (currentPage === 'journey') ? 'average' : chartMode; 
    const currentInflation = (currentPage === 'journey') ? false : adjustForInflation;

    if (currentMetric === "rating") { 
        titleText = currentMode === "total" ? "Movie Count per Year" : "Average Rating per Year";
        yAxisLabelText = currentMode === "total" ? 'Number of Movies' : 'Average IMDb Rating';
        const inflationButton = document.getElementById('inflation-btn'); 
        if (inflationButton && (currentPage === 'dashboard' || currentPage === 'full_dashboard') ) { 
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
        if (inflationButton && (currentPage === 'dashboard' || currentPage === 'full_dashboard')) {
            inflationButton.style.opacity = '1'; inflationButton.style.cursor = 'pointer';
            inflationButton.title = '';
        }
    }
    if (chartTitleEl) chartTitleEl.textContent = titleText;
    
    if (targetChartG && targetChartG.select) { 
         targetChartG.select('.y-axis-label').text(yAxisLabelText);
    } else {
        console.warn("Target 'g' element for chart title/labels not provided or invalid.");
    }
}


function calculateLinearRegression(data) { // data should be [{year: y, value: v}, ...]
    if (!data || data.length < 2) return null;
    const n = data.length;
    const sumX = d3.sum(data, d => d.year);
    const sumY = d3.sum(data, d => d.value); 
    const sumXY = d3.sum(data, d => d.year * d.value);
    const sumXX = d3.sum(data, d => d.year * d.year);
    if ((n * sumXX - sumX * sumX) === 0) return null; // Avoid division by zero
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

// Calculate functions now use page-specific or global filters as needed
function calculateRatingData(countryForChart) {
    const ratingByYear = {};
    if (!combined_movies_data) return [];
    
    const useGlobalFilters = (currentPage === 'dashboard' || currentPage === 'full_dashboard');
    const currentMinRating = useGlobalFilters ? minRating : 0;
    const currentMinVotes = useGlobalFilters ? minVotes : 0;  
    const currentChartModeForCalc = useGlobalFilters ? chartMode : 'average'; // Journey chart defaults to average rating

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
        try { countries = JSON.parse(d.countries_origin.replace(/'/g, '"'));}
        catch (e) { try { countries = eval(d.countries_origin); } catch (e2) { continue; } }
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

    const useGlobalFilters = (currentPage === 'dashboard' || currentPage === 'full_dashboard');
    const currentMinRating = useGlobalFilters ? minRating : 0;
    const currentMinVotes = useGlobalFilters ? minVotes : 0;  
    const currentInflationSetting = useGlobalFilters ? adjustForInflation : false; // Journey chart not inflation-adjusted by default
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
        try { countries = JSON.parse(d.countries_origin.replace(/'/g, '"'));}
        catch (e) { try { countries = eval(d.countries_origin); } catch (e2) { continue; } }
        if (!Array.isArray(countries)) continue;
        const fixedCountries = countries.map(c => countryNameFixes[c] || c);
        if (!fixedCountries.includes(countryForChart)) continue;
        let revenue = 0;
        if (d.grossWorldWWide) {
            revenue = parseFloat(String(d.grossWorldWWide).replace(/[^0-9.]/g, "")) || 0;
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

// updateLineChart now accepts the target 'g' element
function updateLineChart(svgId = "line-chart", targetChartG) {
    if (!targetChartG || !targetChartG.node || typeof targetChartG.node !== 'function') { // Check if targetChartG is a valid D3 selection
        console.warn("Line chart 'g' element not provided or invalid for update. SVG ID:", svgId, "Current Page:", currentPage);
        return;
    }
    // Get scales and axis from the targetChartG's context if they were stored there, or re-create/re-reference them.
    // For simplicity, we are re-using global lineX, lineY, xAxisLine, yAxisLine, but they are configured by createLineChart
    // based on the specific chart's container dimensions. This assumes createLineChart was called first for this targetChartG.

    const container = document.getElementById(targetChartG.node().closest("#line-chart-container, #line-chart-container-journey").id);
    if (!container) { console.warn("Line chart container not found for SVG:", svgId); return; }

    const width = container.clientWidth;
    const height = container.clientHeight || (currentPage === 'journey' ? 450 : 400);
    const innerWidth = width - lineMargin.left - lineMargin.right;
    const innerHeight = height - lineMargin.top - lineMargin.bottom;
    
    // Update scales for this specific chart instance
    const currentLineSvg = d3.select("#" + svgId);
    currentLineSvg.attr("width", width).attr("height", height); 
    targetChartG.attr("transform", `translate(${lineMargin.left}, ${lineMargin.top})`);
    
    // Re-reference or re-create scales specific to this chart instance
    const currentXScale = d3.scaleLinear().range([0, innerWidth]);
    const currentYScale = d3.scaleLinear().range([innerHeight, 0]);
    const currentXAxis = targetChartG.select(".axis.x-axis").attr("transform", `translate(0, ${innerHeight})`);
    const currentYAxis = targetChartG.select(".axis.y-axis");

    targetChartG.select(".axis-label.x-axis-label").attr("x", innerWidth / 2).attr("y", innerHeight + lineMargin.bottom - 15);
    targetChartG.select(".axis-label.y-axis-label").attr("x", -innerHeight / 2).attr("y", -lineMargin.left + 25);
    targetChartG.select(`#trend-line-clip-${svgId} rect`).attr("width", innerWidth).attr("height", innerHeight);

    let data;
    const currentChartMetric = (currentPage === 'journey') ? 'revenue' : mapMetric; // Journey page uses revenue data type for its chart
    const currentChartDisplayMode = (currentPage === 'journey') ? 'average' : chartMode; // Journey page uses average mode
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
                .text(noDataTextContent); // CSS will style
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
    
    // Use local path generator for this instance
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
        .on("mouseover", function(event, d) { 
            const tooltipEl = document.querySelector('.tooltip'); 
            if (!tooltipEl && currentPage !== 'journey') return; 
            
            let valueDisplay, valueLabel, countDisplay = d.count.toLocaleString();
            if (isRatingType) {
                valueDisplay = d.value.toFixed(2); valueLabel = currentChartDisplayMode === "total" ? "Movies" : "Avg Rating";
                if (currentChartDisplayMode === "total") valueDisplay = d.value.toLocaleString();
            } else {
                const val = d.value; 
                valueDisplay = val >= 1e9 ? `$${(val/1e9).toFixed(2)}B` : val >= 1e6 ? `$${(val/1e6).toFixed(2)}M` : `$${val.toLocaleString()}`;
                valueLabel = currentChartDisplayMode === "total" ? (adjustForInflation ? "Total Revenue (2025$)" : "Total Revenue") : (adjustForInflation ? "Avg Revenue (2025$)" : "Avg Revenue");
            }
            // Only show tooltip if on a page that has the tooltip element (dashboard)
            if (tooltipEl && (currentPage === 'dashboard' || currentPage === 'full_dashboard')) { 
                tooltipEl.innerHTML = `<strong>${d.year}</strong><br><div class="tooltip-row">${valueLabel}: ${valueDisplay}</div><div class="tooltip-row">Movies: ${countDisplay}</div>`;
                tooltipEl.style.opacity = 0.95;
                tooltipEl.style.left = (event.pageX) + "px";
                tooltipEl.style.top = (event.pageY) + "px";
            }
            d3.select(this).transition().duration(100).attr("r", 6);
        })
        .on("mouseout", function() {
            const tooltipEl = document.querySelector('.tooltip');
            if (tooltipEl && (currentPage === 'dashboard' || currentPage === 'full_dashboard')) tooltipEl.style.opacity = 0;
            d3.select(this).transition().duration(100).attr("r", 4);
        })
        .transition().duration(500)
        .attr("cx", d => currentXScale(d.year))
        .attr("cy", d => currentYScale(valueAccessor(d)))
        .attr("r", 4).attr("fill", "#82aaff").attr("stroke", "#0f0f23").attr("stroke-width", 1.5); 
}


function setupDashboardControlsEventListeners() {
    if (currentPage !== 'dashboard' && currentPage !== 'full_dashboard') return;

    const yearSlider = document.getElementById('year-slider');
    const yearValue = document.getElementById('year-value');
    const ratingSlider = document.getElementById('rating-slider');
    const ratingValue = document.getElementById('rating-value');
    const votesSlider = document.getElementById('votes-slider');
    const votesValue = document.getElementById('votes-value');
    const metricRadios = document.querySelectorAll('input[name="map-metric"]');
    const resetBtn = document.getElementById('reset-btn');
    const resetZoomBtn = document.getElementById('reset-zoom-btn');
    const inflationButton = document.getElementById('inflation-btn');
    const chartModeButton = document.getElementById('chart-mode-btn'); // For full_dashboard
    const minChartYearSlider = document.getElementById('min-year-slider'); // For full_dashboard
    const minChartYearValue = document.getElementById('min-year-value'); // For full_dashboard
    const maxChartYearSlider = document.getElementById('max-year-slider'); // For full_dashboard
    const maxChartYearValue = document.getElementById('max-year-value'); // For full_dashboard
    
    if (yearSlider) yearSlider.addEventListener('input', function() {
        selectedYear = +this.value;
        if (yearValue) yearValue.textContent = selectedYear;
        if (currentPage === 'dashboard' || currentPage === 'full_dashboard') {
            updateMapVisualization();
            updateDashboardStatistics(movieCountsByYear[selectedYear] || {});
        }
    });

    if (ratingSlider) ratingSlider.addEventListener('input', function() {
        minRating = +this.value;
        if (ratingValue) ratingValue.textContent = minRating.toFixed(1);
        processMovieData(); 
        if (currentPage === 'dashboard' || currentPage === 'full_dashboard') {
            updateMapVisualization();
            updateDashboardStatistics(movieCountsByYear[selectedYear] || {});
        }
        if (currentPage === 'full_dashboard') {
            const dashboardChartG = d3.select("#line-chart").select("g");
            if(!dashboardChartG.empty()) updateLineChart('line-chart', dashboardChartG);
        }
    });

    if (votesSlider) votesSlider.addEventListener('input', function() {
        minVotes = +this.value;
        if (votesValue) votesValue.textContent = minVotes.toLocaleString();
        processMovieData(); 
        if (currentPage === 'dashboard' || currentPage === 'full_dashboard') {
            updateMapVisualization();
            updateDashboardStatistics(movieCountsByYear[selectedYear] || {});
        }
        if (currentPage === 'full_dashboard') {
            const dashboardChartG = d3.select("#line-chart").select("g");
            if(!dashboardChartG.empty()) updateLineChart('line-chart', dashboardChartG);
        }
    });

    if (metricRadios) metricRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                mapMetric = this.value; 
                if (currentPage === 'dashboard' || currentPage === 'full_dashboard') {
                    updateMapVisualization();
                }
                if (currentPage === 'full_dashboard') {
                    const dashboardChartG = d3.select("#line-chart").select("g");
                     if(!dashboardChartG.empty()) {
                        updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
                        updateLineChart('line-chart', dashboardChartG);
                    }
                }
            }
        });
    });

    if (resetBtn) resetBtn.addEventListener('click', function() {
        selectedYear = 2025; minRating = 7; minVotes = 10000; mapMetric = "count";
        selectedCountry = "United States of America"; 
        adjustForInflation = false; 
        chartMode = "average"; // Reset chartMode for full_dashboard
        minChartYear = 1925; // Reset chart years for full_dashboard
        maxChartYear = 2025;

        if (yearSlider) yearSlider.value = selectedYear; if (yearValue) yearValue.textContent = selectedYear;
        if (ratingSlider) ratingSlider.value = minRating; if (ratingValue) ratingValue.textContent = minRating.toFixed(1);
        if (votesSlider) votesSlider.value = minVotes; if (votesValue) votesValue.textContent = minVotes.toLocaleString();
        const metricCountRadio = document.getElementById('metric-count');
        if (metricCountRadio) metricCountRadio.checked = true;
        
        if (inflationButton) {
            inflationButton.textContent = 'Adjust for Inflation';
            inflationButton.classList.remove('active');
        }
        // Reset chart mode button text if it exists on dashboard
        if (chartModeButton && currentPage === 'full_dashboard') {
             chartModeButton.textContent = mapMetric === "rating" ? 'Movie Count per Year' : 'Total Revenue per Year';
             chartModeButton.classList.remove('active'); // Assuming 'active' class is used for yellow style
        }
        if (minChartYearSlider && currentPage === 'full_dashboard') {
            minChartYearSlider.value = minChartYear;
            if(minChartYearValue) minChartYearValue.textContent = minChartYear;
        }
        if (maxChartYearSlider && currentPage === 'full_dashboard') {
            maxChartYearSlider.value = maxChartYear;
            if(maxChartYearValue) maxChartYearValue.textContent = maxChartYear;
        }
        
        processMovieData();
        if (currentPage === 'dashboard' || currentPage === 'full_dashboard') {
            updateMapVisualization();
            updateDashboardStatistics(movieCountsByYear[selectedYear] || {});
            resetMapZoom(); 
        }
        if (currentPage === 'full_dashboard') {
            const dashboardChartG = d3.select("#line-chart").select("g");
            if(!dashboardChartG.empty()) {
                const selectedCountryEl = document.getElementById('selected-country');
                if(selectedCountryEl) selectedCountryEl.textContent = selectedCountry; // Reset selected country display
                updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
                updateLineChart('line-chart', dashboardChartG);
            }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (resetZoomBtn) resetZoomBtn.addEventListener('click', resetMapZoom);

    if (inflationButton) inflationButton.addEventListener('click', function() {
        // This button might affect dashboard summary stats even if line chart is not on map-only page
        if (mapMetric === "rating" && currentPage === 'full_dashboard') { 
             // Still allow toggle for consistency if user expects it, but primary effect is on revenue
        }
        adjustForInflation = !adjustForInflation;
        this.textContent = adjustForInflation ? '2025 Dollars (ON)' : 'Adjust for Inflation';
        this.classList.toggle('active', adjustForInflation); 
        
        processMovieData(); 
        if (currentPage === 'dashboard' || currentPage === 'full_dashboard') {
            updateMapVisualization(); 
            updateDashboardStatistics(movieCountsByYear[selectedYear] || {}); 
        }
        if (currentPage === 'full_dashboard') {
            const dashboardChartG = d3.select("#line-chart").select("g");
            if(!dashboardChartG.empty()) {
                updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
                updateLineChart('line-chart', dashboardChartG);
            }
        }
    });

    // Event listeners for full_dashboard line chart controls
    if (currentPage === 'full_dashboard') {
        if (chartModeButton) chartModeButton.addEventListener('click', function() {
            chartMode = chartMode === "average" ? "total" : "average";
            // Update button text and style
            if (mapMetric === "rating") {
                this.textContent = chartMode === "total" ? 'Avg Rating per Year' : 'Movie Count per Year';
            } else {
                this.textContent = chartMode === "total" ? 'Avg Revenue per Movie' : 'Total Revenue per Year';
            }
            this.classList.toggle('active', chartMode === "total");

            const dashboardChartG = d3.select("#line-chart").select("g");
            if(!dashboardChartG.empty()) {
                updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
                updateLineChart('line-chart', dashboardChartG);
            }
        });

        if (minChartYearSlider) minChartYearSlider.addEventListener('input', function() {
            minChartYear = +this.value;
            if (minChartYear > maxChartYear) { 
                maxChartYear = minChartYear;
                if (maxChartYearSlider) maxChartYearSlider.value = maxChartYear;
                if (maxChartYearValue) maxChartYearValue.textContent = maxChartYear;
            }
            if (minChartYearValue) minChartYearValue.textContent = minChartYear;
            const dashboardChartG = d3.select("#line-chart").select("g");
            if(!dashboardChartG.empty()) updateLineChart('line-chart', dashboardChartG);
        });

        if (maxChartYearSlider) maxChartYearSlider.addEventListener('input', function() {
            maxChartYear = +this.value;
            if (maxChartYear < minChartYear) { 
                minChartYear = maxChartYear;
                if (minChartYearSlider) minChartYearSlider.value = minChartYear;
                if (minChartYearValue) minChartYearValue.textContent = minChartYear;
            }
            if (maxChartYearValue) maxChartYearValue.textContent = maxChartYear;
            const dashboardChartG = d3.select("#line-chart").select("g");
            if(!dashboardChartG.empty()) updateLineChart('line-chart', dashboardChartG);
        });
    }
}

function updateDashboardStatistics(dataForYear) {
    // This function is dashboard-specific
    if (currentPage !== 'dashboard' && currentPage !== 'full_dashboard') return;

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
        '$' + (totalRevenueValue / 1e9).toFixed(1) + 'B' : 
        (totalMovies > 0 && Object.values(dataForYear).some(d => d.revenue !== undefined) ? '$0B' : 'N/A');
    totalRevenueEl.textContent = revenueText;
    totalRevenueLabelEl.textContent = adjustForInflation ? 'Total Revenue (2025 $)' : 'Total Revenue';
}

window.addEventListener('resize', debounce(() => {
    if ((currentPage === 'dashboard' || currentPage === 'full_dashboard') && svgMap) {
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
        const journeyChartG = d3.select("#line-chart-journey").select("g");
        if(!journeyChartG.empty()){
            createLineChart('line-chart-container-journey', 'line-chart-journey'); 
            updateChartTitleAndLabels('chart-title-journey', 'selected-country-journey', d3.select("#line-chart-journey").select("g"));
            updateLineChart('line-chart-journey', d3.select("#line-chart-journey").select("g"));
        }
    }
    if (currentPage === 'full_dashboard') {
        const dashboardChartG = d3.select("#line-chart").select("g");
        if(!dashboardChartG.empty()){
            createLineChart('line-chart-container', 'line-chart'); 
            updateChartTitleAndLabels('chart-title', 'selected-country', d3.select("#line-chart").select("g"));
            updateLineChart('line-chart', d3.select("#line-chart").select("g"));
        }
    }
}, 250));
