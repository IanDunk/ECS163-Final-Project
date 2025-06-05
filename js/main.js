// Global variables
let combined_movies_data = null;
let customGeoJSON = null;
let movieCountsByYear = {};
let selectedCountry = "United States of America"; 

let selectedYear = 2025;
let minRating = 7;
let minVotes = 10000;
let mapMetric = "count"; 
let adjustForInflation = false;
let chartMode = "average"; 
let minChartYear = 1925;
let maxChartYear = 2025;

let svgMap, gMap, projectionMap, pathMap, zoomMap, legendGroupMap;

let currentPage = null; 

const historicalCPI = {
    1925: 17.5, 1926: 17.7, 1927: 17.4, 1928: 17.2, 1929: 17.2, 1930: 16.7, 1931: 15.2, 1932: 13.6, 1933: 12.9, 1934: 13.4, 1935: 13.7, 1936: 13.9, 1937: 14.4, 1938: 14.1, 1939: 13.9, 1940: 14.0, 1941: 14.7, 1942: 16.3, 1943: 17.3, 1944: 17.6, 1945: 18.0, 1946: 19.5, 1947: 22.3, 1948: 24.0, 1949: 23.8, 1950: 24.1, 1951: 26.0, 1952: 26.6, 1953: 26.8, 1954: 26.9, 1955: 26.8, 1956: 27.2, 1957: 28.1, 1958: 28.9, 1959: 29.2, 1960: 29.6, 1961: 29.9, 1962: 30.3, 1963: 30.6, 1964: 31.0, 1965: 31.5, 1966: 32.5, 1967: 33.4, 1968: 34.8, 1969: 36.7, 1970: 38.8, 1971: 40.5, 1972: 41.8, 1973: 44.4, 1974: 49.3, 1975: 53.8, 1976: 56.9, 1977: 60.6, 1978: 65.2, 1979: 72.6, 1980: 82.4, 1981: 90.9, 1982: 96.5, 1983: 99.6, 1984: 103.9, 1985: 107.6, 1986: 109.6, 1987: 113.6, 1988: 118.3, 1989: 124.0, 1990: 130.7, 1991: 136.2, 1992: 140.3, 1993: 144.5, 1994: 148.2, 1995: 152.4, 1996: 156.9, 1997: 160.5, 1998: 163.0, 1999: 166.6, 2000: 172.2, 2001: 177.1, 2002: 179.9, 2003: 184.0, 2004: 188.9, 2005: 195.3, 2006: 201.6, 2007: 207.3, 2008: 215.3, 2009: 214.5, 2010: 218.1, 2011: 224.9, 2012: 229.6, 2013: 233.0, 2014: 236.7, 2015: 237.0, 2016: 240.0, 2017: 245.1, 2018: 251.1, 2019: 255.7, 2020: 258.8, 2021: 271.0, 2022: 292.7, 2023: 304.7, 2024: 314.4, 2025: 321.5 
};

const countryNameFixes = {
    "Bosnia and Herzegovina": "Bosnia and Herz.", "Cayman Islands": "Cayman Is.", "Central African Republic": "Central African Rep.", "Czech Republic": "Czechia", "Czechoslovakia": "Czechia", "Dominican Republic": "Dominican Rep.", "East Germany": "Germany", "Federal Republic of Yugoslavia": "Serbia", "Gibraltar": "United Kingdom", "Guadeloupe": "France", "Korea": "South Korea", "Martinique": "France", "Netherlands Antilles": "Netherlands", "North Vietnam": "Vietnam", "Occupied Palestinian Territory": "Palestine", "Reunion": "France", "Saint Kitts and Nevis": "St. Kitts and Nevis", "Serbia and Montenegro": "Serbia", "Siam": "Thailand", "Soviet Union": "Russia", "Swaziland": "Eswatini", "The Democratic Republic of Congo": "Dem. Rep. Congo", "United States": "United States of America", "West Germany": "Germany", "Yugoslavia": "Serbia"
};

// --- ALL FUNCTION DEFINITIONS MOVED TO THE TOP ---

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

function processMovieData() {
    movieCountsByYear = {};
    if (!combined_movies_data) { console.warn("Movie data not available for processing."); return; }

    const currentMinRating = (currentPage === 'journey') ? 0 : minRating;
    const currentMinVotes = (currentPage === 'journey') ? 0 : minVotes;
    
    for (const d of combined_movies_data) {
        const year = +d.Year;
        const ratingVal = +d.Rating;
        const revenueStr = d.grossWorldWWide;
        const voteStr = d.Votes;

        if (!year || !d.countries_origin || isNaN(ratingVal) || ratingVal < currentMinRating) continue;

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
        const processedRevenue = adjustForInflationAmount(revenue, year); 

        let countries;
        try {
            countries = JSON.parse(d.countries_origin.replace(/'/g, '"'));
        } catch (e) { try { countries = eval(d.countries_origin); } catch (e2) { console.warn("Could not parse countries for row:", d); continue; } }
        if (!Array.isArray(countries)) continue;

        if (!movieCountsByYear[year]) movieCountsByYear[year] = {};

        for (let country of countries) {
            country = countryNameFixes[country] || country;
            if (!movieCountsByYear[year][country]) {
                movieCountsByYear[year][country] = { count: 0, revenue: 0, ratingSum: 0, ratingCount: 0 };
            }
            movieCountsByYear[year][country].count++;
            movieCountsByYear[year][country].revenue += processedRevenue; 
            movieCountsByYear[year][country].ratingSum += ratingVal;
            movieCountsByYear[year][country].ratingCount++;
        }
    }
    console.log("Movie data processed.");
}

function createMap() {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) { console.warn("Map container not found for createMap."); return false; } // Return false on failure
    
    const loadingEl = mapContainer.querySelector('.loading');
    if (loadingEl) loadingEl.style.display = 'none';
    d3.select(mapContainer).select("svg").remove();

    const width = mapContainer.clientWidth;
    const height = mapContainer.clientHeight || 600; 
    if (width === 0 || height === 0) { 
        console.error("Map container has zero dimensions for createMap. Cannot render map."); 
        mapContainer.innerHTML = `<p style="color: #e53e3e; text-align:center; padding:1rem;">Map area has no dimensions.</p>`;
        return false;
    }

    svgMap = d3.select("#map-container").append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "transparent"); 

    gMap = svgMap.append("g");
    projectionMap = d3.geoMercator().scale(Math.min(width / 6.2, height / 3.6)).translate([width / 2, height / 1.75]);
    pathMap = d3.geoPath(projectionMap);

    zoomMap = d3.zoom().scaleExtent([1, 12]).on("zoom", () => {
        // d3.event is for V5. For V6+ it's just event. For safety, check both.
        const currentEvent = d3.event || window.event; 
        if (currentEvent && currentEvent.transform) gMap.attr("transform", currentEvent.transform);
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
    return true; // Indicate success
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
    if (height === 0 && mapContainer) {console.warn("Map container height is 0 for legend creation."); return;}

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
    if (currentPage !== 'dashboard_map_only' && currentPage !== 'full_dashboard') return;
    d3.select(this).transition().duration(100)
        .attr("stroke-width", 1.5) 
        .attr("stroke", "#82aaff"); 
}

function handleMapMouseMove(d) { 
    if (currentPage !== 'dashboard_map_only' && currentPage !== 'full_dashboard') return;
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
    // Use d3.pointer for D3 v6+ to get mouse coordinates relative to an element
    // For D3 v5, d3.event.pageX/pageY is fine if the tooltip is appended to body
    const event = d3.event || window.event;
    if (event) { 
        tooltipEl.style.left = (event.pageX) + "px"; 
        tooltipEl.style.top = (event.pageY) + "px";
    }
}

function handleMapMouseOut() {
    if (currentPage !== 'dashboard_map_only' && currentPage !== 'full_dashboard') return;
    d3.select(this).transition().duration(100)
        .attr("stroke-width", 0.5)
        .attr("stroke", "#4A5568"); 
    const tooltipEl = document.querySelector('.tooltip');
    if (tooltipEl) tooltipEl.style.opacity = 0;
}

function handleMapCountryClick(d) {
    if (currentPage !== 'full_dashboard') { 
        if (currentPage === 'dashboard_map_only') {
            selectedCountry = d.properties.name; 
            console.log("Map selected country on map-only dashboard:", selectedCountry);
        }
        return;
    }
    selectedCountry = d.properties.name; 
    console.log("Map selected country on full_dashboard:", selectedCountry);

    const dashboardChartG = d3.select("#line-chart").select("g"); 
    if (!dashboardChartG.empty()) {
         updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
         updateLineChart('line-chart', dashboardChartG); 
    } else {
        console.warn("Dashboard line chart 'g' element not found for update on map click. Was createLineChart successful for it?");
    }
    const lineChartSection = document.querySelector('#line-chart-container');
    if(lineChartSection) {
        const vizContainer = lineChartSection.closest('.viz-container'); 
        if(vizContainer) vizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

const lineChartMargin = {top: 30, right: 40, bottom: 60, left: 90};

function createLineChart(containerId, svgId) {
    console.log(`Attempting to create line chart in #${containerId} with SVG #${svgId}`);
    const container = document.getElementById(containerId);
    if (!container) { console.error(`Line chart container #${containerId} NOT FOUND.`); return null; }
    
    const svgElement = document.getElementById(svgId);
    if (!svgElement) { console.error(`Line chart SVG element #${svgId} NOT FOUND.`); return null; }

    const loadingElInContainer = container.querySelector('.loading-journey, .loading');
    if(loadingElInContainer) loadingElInContainer.style.display = 'none'; // Hide loading as we start creation
    d3.select(svgElement).selectAll("*").remove(); // Clear previous SVG content


    let width = container.clientWidth;
    let height = container.clientHeight; 
    console.log(`Container #${containerId} initial dimensions: Width=${width}, Height=${height}`);

    if (width === 0 || height === 0) {
        const styleHeight = parseInt(container.style.height, 10);
        if (styleHeight > 0) height = styleHeight;
        else height = (currentPage === 'journey' ? 450 : 400); 

        if (width === 0 && container.offsetWidth > 0) width = container.offsetWidth;
        else if (width === 0) width = 600; 
        console.warn(`Container #${containerId} had zero client dimensions, using fallbacks/style. New Width=${width}, New Height=${height}`);
    }
    
    const currentLineChartSvg = d3.select("#" + svgId) 
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "transparent"); 

    const innerWidth = width - lineChartMargin.left - lineChartMargin.right;
    const innerHeight = height - lineChartMargin.top - lineChartMargin.bottom;

    if (innerWidth <=0 || innerHeight <=0) {
        console.error(`Cannot draw line chart in #${containerId}, inner dimensions are invalid or too small: ${innerWidth}x${innerHeight} (Margins: L${lineChartMargin.left} R${lineChartMargin.right} T${lineChartMargin.top} B${lineChartMargin.bottom})`);
        const errHtml = `<p style="color: #e53e3e; text-align:center; padding:1rem;">Chart area too small to render.</p>`;
        if (loadingElInContainer) loadingElInContainer.innerHTML = errHtml;
        else if (svgId === 'line-chart-journey') container.innerHTML = errHtml; // Only replace container if no loading div
        else if (svgId === 'line-chart' && currentPage === 'full_dashboard') container.innerHTML = errHtml;
        return null;
    }
    
    const currentLineChartG = currentLineChartSvg.append("g")
        .attr("transform", `translate(${lineChartMargin.left}, ${lineChartMargin.top})`);
    
    currentLineChartG.node().__currentX = d3.scaleLinear().range([0, innerWidth]);
    currentLineChartG.node().__currentY = d3.scaleLinear().range([innerHeight, 0]);
    
    currentLineChartG.append("g").attr("class", "grid x-grid");
    currentLineChartG.append("g").attr("class", "grid y-grid");

    currentLineChartG.append("g").attr("class", "axis x-axis").attr("transform", `translate(0, ${innerHeight})`);
    currentLineChartG.append("g").attr("class", "axis y-axis");
    
    currentLineChartG.append("text").attr("class", "axis-label x-axis-label")
        .attr("text-anchor", "middle").attr("x", innerWidth / 2).attr("y", innerHeight + lineChartMargin.bottom - 15).text("Year");
    
    currentLineChartG.append("text").attr("class", "axis-label y-axis-label") 
        .attr("text-anchor", "middle").attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2).attr("y", -lineChartMargin.left + 25).text("Value"); 
    
    currentLineChartG.append("path").attr("class", "line-path")
      .style("fill", "none")
      .style("stroke", "#82aaff") 
      .style("stroke-width", "2.5px");
    
    currentLineChartG.append("defs").append("clipPath").attr("id", `trend-line-clip-${svgId}`) 
        .append("rect").attr("x", 0).attr("y", 0).attr("width", innerWidth).attr("height", innerHeight);

    currentLineChartG.append("path").attr("class", "trend-line")
        .style("fill", "none")
        .style("stroke", "#f59e0b") 
        .style("stroke-width", "2px")
        .style("stroke-dasharray", "6,6")
        .attr("clip-path", `url(#trend-line-clip-${svgId})`);
    
    currentLineChartG.append("g").attr("class", "dots-group");

    if (currentPage === 'full_dashboard') { 
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
    console.log(`Line chart #${svgId} created successfully with G element:`, currentLineChartG.node());
    return currentLineChartG; 
}

function updateChartTitleAndLabels(titleId = "chart-title", countryDisplayId = "selected-country", targetChartG) {
    // ... (Keep existing implementation, ensure targetChartG is used)
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
        if (inflationButton && (currentPage === 'dashboard_map_only' || currentPage === 'full_dashboard') ) { 
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
        if (inflationButton && (currentPage === 'dashboard_map_only' || currentPage === 'full_dashboard')) {
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
    // ... (Keep existing implementation)
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
    // ... (Keep existing implementation)
    const ratingByYear = {};
    if (!combined_movies_data) return [];
    
    const useGlobalFilters = (currentPage === 'dashboard_map_only' || currentPage === 'full_dashboard');
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
    // ... (Keep existing implementation)
    const revenueByYear = {};
    if (!combined_movies_data) return [];

    const useGlobalFilters = (currentPage === 'dashboard_map_only' || currentPage === 'full_dashboard');
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

function updateLineChart(svgId, targetChartG) {
    if (!targetChartG || !targetChartG.node || typeof targetChartG.node !== 'function') {
        console.warn(`Line chart 'g' element not provided or invalid for update. SVG ID: ${svgId}, Page: ${currentPage}`);
        return;
    }
    console.log(`Updating line chart: ${svgId} on page: ${currentPage}`);

    const currentXScale = targetChartG.node().__currentX;
    const currentYScale = targetChartG.node().__currentY;

    if (!currentXScale || !currentYScale) {
        console.error("Scales (__currentX, __currentY) not found on targetChartG for chart:", svgId, ". Was createLineChart successful and did it store them?");
        return;
    }
    
    const currentXAxis = targetChartG.select(".axis.x-axis"); 
    const currentYAxis = targetChartG.select(".axis.y-axis");

    const container = document.getElementById(targetChartG.node().closest("#line-chart-container, #line-chart-container-journey").id);
    if (!container) { console.warn("Line chart container not found for SVG:", svgId); return; }

    const width = container.clientWidth;
    const height = container.clientHeight || (currentPage === 'journey' ? 450 : 400);
    const innerWidth = width - lineChartMargin.left - lineChartMargin.right;
    const innerHeight = height - lineChartMargin.top - lineChartMargin.bottom;
    
    if (innerWidth <= 0 || innerHeight <= 0) {
        console.error(`Cannot update line chart in #${container.id}, inner dimensions are invalid: ${innerWidth}x${innerHeight}`);
        const loadingEl = container.querySelector('.loading-journey, .loading');
        if (loadingEl) loadingEl.innerHTML = `<p style="color: #e53e3e;">Chart area too small to render.</p>`;
        else {
            targetChartG.selectAll(".no-data-text").remove(); 
            targetChartG.append("text").attr("class", "no-data-text")
                .attr("x", innerWidth / 2 || width / 2) 
                .attr("y", innerHeight / 2 || height / 2)
                .attr("text-anchor", "middle")
                .text("Chart area too small.");
        }
        return;
    }

    const currentLineSvg = d3.select("#" + svgId);
    currentLineSvg.attr("width", width).attr("height", height); 
    targetChartG.attr("transform", `translate(${lineChartMargin.left}, ${lineChartMargin.top})`);
    
    currentXScale.range([0, innerWidth]); 
    currentYScale.range([innerHeight, 0]);
    currentXAxis.attr("transform", `translate(0, ${innerHeight})`);

    targetChartG.select(".axis-label.x-axis-label").attr("x", innerWidth / 2).attr("y", innerHeight + lineChartMargin.bottom - 15);
    targetChartG.select(".axis-label.y-axis-label").attr("x", -innerHeight / 2).attr("y", -lineChartMargin.left + 25);
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
    
    const currentLinePathGenerator = d3.line()
        .defined(d => valueAccessor(d) != null && !isNaN(valueAccessor(d)))
        .x(d => currentXScale(d.year))
        .y(d => currentYScale(valueAccessor(d)))
        .curve(d3.curveMonotoneX);
    targetChartG.select(".line-path").datum(data).transition().duration(500).attr("d", currentLinePathGenerator);

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
        .style("fill", "#82aaff") 
        .style("stroke", "#0f0f23") 
        .style("stroke-width", "1.5px")
        .on("mouseover", function(event, d) { 
            const tooltipEl = document.querySelector('.tooltip'); 
            if (!tooltipEl && currentPage !== 'journey') return; 
            
            let valueDisplay, valueLabel, countDisplay = d.count.toLocaleString();
            const pageChartMode = (currentPage === 'journey') ? 'average' : chartMode;
            const pageMapMetric = (currentPage === 'journey') ? 'revenue' : mapMetric;
            const pageAdjustForInflation = (currentPage === 'journey') ? false : adjustForInflation;

            if (pageMapMetric === 'rating') {
                valueDisplay = d.value.toFixed(2); valueLabel = pageChartMode === "total" ? "Movies" : "Avg Rating";
                if (pageChartMode === "total") valueDisplay = d.value.toLocaleString();
            } else {
                const val = d.value; 
                valueDisplay = val >= 1e9 ? `$${(val/1e9).toFixed(2)}B` : val >= 1e6 ? `$${(val/1e6).toFixed(2)}M` : `$${val.toLocaleString()}`;
                valueLabel = pageChartMode === "total" ? (pageAdjustForInflation ? "Total Revenue (2025$)" : "Total Revenue") : (pageAdjustForInflation ? "Avg Revenue (2025$)" : "Avg Revenue");
            }
            if (tooltipEl && (currentPage === 'full_dashboard')) { 
                tooltipEl.innerHTML = `<strong>${d.year}</strong><br><div class="tooltip-row">${valueLabel}: ${valueDisplay}</div><div class="tooltip-row">Movies: ${countDisplay}</div>`;
                tooltipEl.style.opacity = 0.95;
                tooltipEl.style.left = (event.pageX) + "px";
                tooltipEl.style.top = (event.pageY) + "px";
            }
            d3.select(this).transition().duration(100).attr("r", 6);
        })
        .on("mouseout", function() {
            const tooltipEl = document.querySelector('.tooltip');
            if (tooltipEl && (currentPage === 'full_dashboard')) tooltipEl.style.opacity = 0;
            d3.select(this).transition().duration(100).attr("r", 4);
        })
        .transition().duration(500)
        .attr("cx", d => currentXScale(d.year))
        .attr("cy", d => currentYScale(valueAccessor(d)))
        .attr("r", 4);
}

function setupDashboardControlsEventListeners() {
    if (currentPage !== 'dashboard_map_only' && currentPage !== 'full_dashboard') return;

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
    
    const chartModeButton = document.getElementById('chart-mode-btn'); 
    const minChartYearSlider = document.getElementById('min-year-slider'); 
    const minChartYearValue = document.getElementById('min-year-value'); 
    const maxChartYearSlider = document.getElementById('max-year-slider'); 
    const maxChartYearValue = document.getElementById('max-year-value'); 
    
    if (yearSlider) yearSlider.addEventListener('input', function() {
        selectedYear = +this.value;
        if (yearValue) yearValue.textContent = selectedYear;
        if (currentPage === 'dashboard_map_only' || currentPage === 'full_dashboard') {
            updateMapVisualization();
            updateDashboardStatistics(movieCountsByYear[selectedYear] || {});
        }
    });

    if (ratingSlider) ratingSlider.addEventListener('input', function() {
        minRating = +this.value;
        if (ratingValue) ratingValue.textContent = minRating.toFixed(1);
        processMovieData(); 
        if (currentPage === 'dashboard_map_only' || currentPage === 'full_dashboard') {
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
        if (currentPage === 'dashboard_map_only' || currentPage === 'full_dashboard') {
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
                if (currentPage === 'dashboard_map_only' || currentPage === 'full_dashboard') {
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
        chartMode = "average"; 
        minChartYear = 1925; 
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
        if (chartModeButton && currentPage === 'full_dashboard') {
             chartModeButton.textContent = mapMetric === "rating" ? 'Movie Count per Year' : 'Total Revenue per Year';
             chartModeButton.classList.remove('active'); 
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
        if (currentPage === 'dashboard_map_only' || currentPage === 'full_dashboard') {
            updateMapVisualization();
            updateDashboardStatistics(movieCountsByYear[selectedYear] || {});
            resetMapZoom(); 
        }
        if (currentPage === 'full_dashboard') {
            const dashboardChartG = d3.select("#line-chart").select("g");
            if(!dashboardChartG.empty()) {
                const selectedCountryEl = document.getElementById('selected-country');
                if(selectedCountryEl) selectedCountryEl.textContent = selectedCountry; 
                updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
                updateLineChart('line-chart', dashboardChartG);
            }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (resetZoomBtn) resetZoomBtn.addEventListener('click', resetMapZoom);

    if (inflationButton) inflationButton.addEventListener('click', function() {
        if (mapMetric === "rating" && currentPage === 'full_dashboard') { 
        }
        adjustForInflation = !adjustForInflation;
        this.textContent = adjustForInflation ? '2025 Dollars (ON)' : 'Adjust for Inflation';
        this.classList.toggle('active', adjustForInflation); 
        
        processMovieData(); 
        if (currentPage === 'dashboard_map_only' || currentPage === 'full_dashboard') {
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

    if (currentPage === 'full_dashboard') {
        if (chartModeButton) chartModeButton.addEventListener('click', function() {
            chartMode = chartMode === "average" ? "total" : "average";
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
    if (currentPage !== 'dashboard_map_only' && currentPage !== 'full_dashboard') return;

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
    console.log("Window resize event triggered. Current page:", currentPage);
    if ((currentPage === 'dashboard_map_only' || currentPage === 'full_dashboard') && document.getElementById('map-container')) {
        const mapContainer = document.getElementById('map-container');
        if (mapContainer && mapContainer.clientWidth > 0 && mapContainer.clientHeight > 0) {
            console.log("Recreating map due to resize.");
            createMap(); 
            updateMapVisualization(); 
        } else {
            console.warn("Map container not ready for resize or has zero dimensions.");
        }
    }
    if (currentPage === 'journey' && document.getElementById('line-chart-container-journey')) {
        const journeyContainer = document.getElementById('line-chart-container-journey');
        if (journeyContainer && journeyContainer.clientWidth > 0 && journeyContainer.clientHeight > 0) {
            console.log("Recreating journey line chart due to resize.");
            const journeyChartG = createLineChart('line-chart-container-journey', 'line-chart-journey'); 
            if (journeyChartG) {
                updateChartTitleAndLabels('chart-title-journey', 'selected-country-journey', journeyChartG);
                updateLineChart('line-chart-journey', journeyChartG);
            }
        } else {
             console.warn("Journey line chart container not ready for resize or has zero dimensions.");
        }
    }
    if (currentPage === 'full_dashboard' && document.getElementById('line-chart-container')) {
        const dashboardChartContainer = document.getElementById('line-chart-container');
         if (dashboardChartContainer && dashboardChartContainer.clientWidth > 0 && dashboardChartContainer.clientHeight > 0) {
            console.log("Recreating dashboard line chart due to resize.");
            const dashboardChartG = createLineChart('line-chart-container', 'line-chart'); 
            if(dashboardChartG){
                updateChartTitleAndLabels('chart-title', 'selected-country', dashboardChartG);
                updateLineChart('line-chart', dashboardChartG);
            }
        } else {
            console.warn("Dashboard line chart container not ready for resize or has zero dimensions.");
        }
    }
}, 250));

// --- INITIALIZATION FUNCTIONS PER PAGE ---
// These are defined above, before the DOMContentLoaded listener that might call them.
// No need to redefine them here.
