import { currencyRatesToUSD } from './currencyRates.js';

// Global variables
let combined_movies_data = null;
let customGeoJSON = null;
let movieCountsByYear = {};
let selectedCountry = "United States of America"; // Default selected country

// Filter state
let selectedYear = 2025;
let minRating = 7;
let minVotes = 10000;
let mapMetric = "count"; // "count" or "rating"
let adjustForInflation = false; // New inflation adjustment toggle
let chartMode = "average"; // "average" or "total" - controls line chart display mode
let minChartYear = 1925; // Minimum year for line chart
let maxChartYear = 2025; // Maximum year for line chart
let scatterZoom; 
let showProfitRatio = false;
let scatterSvg, scatterView, dotsScatter;
let xScatter, yScatter;
let xAxisScatterG, yAxisScatterG;

// Add missing legendGroup variable
let legendGroup;

// Historical CPI data from Federal Reserve Bank of Minneapolis
// Used to adjust historical dollar amounts to 2025 dollars
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
    2025: 321.5 // Estimated based on current trends (approximately 2.3% inflation)
};

// Function to adjust dollar amount for inflation to 2025 dollars
function adjustForInflationAmount(amount, year) {
    if (!adjustForInflation || !historicalCPI[year] || !amount || amount <= 0) {
        return amount;
    }
    const cpi2025 = historicalCPI[2025];
    const cpiYear = historicalCPI[year];
    return amount * (cpi2025 / cpiYear);
}

// Country name fixes mapping
const countryNameFixes = {
    "Bosnia and Herzegovina": "Bosnia and Herz.",
    "Cayman Islands": "Cayman Is.",
    "Central African Republic": "Central African Rep.",
    "Czech Republic": "Czechia",
    "Czechoslovakia": "Czechia",
    "Dominican Republic": "Dominican Rep.",
    "East Germany": "Germany",
    "Federal Republic of Yugoslavia": "Serbia",
    "Gibraltar": "United Kingdom",
    "Guadeloupe": "France",
    "Korea": "Korea, South",
    "Martinique": "France",
    "Netherlands Antilles": "Netherlands",
    "North Vietnam": "Viet Nam",
    "Occupied Palestinian Territory": "Palestine",
    "Reunion": "France",
    "Saint Kitts and Nevis": "St. Kitts and Nevis",
    "Serbia and Montenegro": "Serbia",
    "Siam": "Thailand",
    "Soviet Union": "Russia",
    "Swaziland": "Eswatini",
    "The Democratic Republic of Congo": "Democratic Republic of the Congo",
    "United States": "United States of America",
    "West Germany": "Germany",
    "Yugoslavia": "Serbia"
};

// Get DOM elements
const yearSlider = document.getElementById('year-slider');
const yearValue = document.getElementById('year-value');
const ratingSlider = document.getElementById('rating-slider');
const ratingValue = document.getElementById('rating-value');
const votesSlider = document.getElementById('votes-slider');
const votesValue = document.getElementById('votes-value');
const metricRadios = document.querySelectorAll('input[name="map-metric"]');
const resetBtn = document.getElementById('reset-btn');
const resetZoomBtn = document.getElementById('reset-zoom-btn');
const inflationBtn = document.getElementById('inflation-btn');
const chartModeBtn = document.getElementById('chart-mode-btn');
const minYearSlider = document.getElementById('min-year-slider');
const minYearValue = document.getElementById('min-year-value');
const maxYearSlider = document.getElementById('max-year-slider');
const maxYearValue = document.getElementById('max-year-value');
const tooltip = document.querySelector('.tooltip');

// Summary stat elements
const totalMoviesEl = document.getElementById('total-movies');
const totalCountriesEl = document.getElementById('total-countries');
const avgRatingEl = document.getElementById('avg-rating');
const totalRevenueEl = document.getElementById('total-revenue');

// Event listeners
yearSlider.addEventListener('input', function() {
    selectedYear = +this.value;
    yearValue.textContent = selectedYear;
    updateVisualization();
    updateHighBudgetScatter();
});

ratingSlider.addEventListener('input', function() {
    minRating = +this.value;
    ratingValue.textContent = minRating.toFixed(1);
    processMovieData();
    updateVisualization();
    updateLineChart();
});

votesSlider.addEventListener('input', function() {
    minVotes = +this.value;
    votesValue.textContent = minVotes.toLocaleString();
    processMovieData();
    updateVisualization();
    updateLineChart();
});

metricRadios.forEach(radio => {
    radio.addEventListener('change', function() {
        if (this.checked) {
            mapMetric = this.value;
            updateVisualization();
            updateLineChart(); // Update line chart when map metric changes
            updateChartTitleAndLabels(); // Update chart title and labels
        }
    });
});

resetBtn.addEventListener('click', function() {
    // Reset all filters to defaults
    selectedYear = 2025;
    minRating = 7;
    minVotes = 10000;
    mapMetric = "count";
    selectedCountry = "United States of America";
    adjustForInflation = false;
    chartMode = "average";
    minChartYear = 1925;
    maxChartYear = 2025;
    
    // Update UI
    yearSlider.value = selectedYear;
    yearValue.textContent = selectedYear;
    ratingSlider.value = minRating;
    ratingValue.textContent = minRating.toFixed(1);
    votesSlider.value = minVotes;
    votesValue.textContent = minVotes.toLocaleString();
    minYearSlider.value = minChartYear;
    minYearValue.textContent = minChartYear;
    maxYearSlider.value = maxChartYear;
    maxYearValue.textContent = maxChartYear;
    document.getElementById('metric-count').checked = true;
    document.getElementById('selected-country').textContent = selectedCountry;
    
    // Reset inflation button
    inflationBtn.textContent = 'Adjust for Inflation';
    inflationBtn.className = 'button inflation-button';
    
    // Reset chart mode button
    chartModeBtn.textContent = 'Total Revenue per Year';
    chartModeBtn.className = 'button chart-mode-button';
    
    // Reset chart title
    document.getElementById('chart-title').textContent = 'Average Revenue per Movie';
    
    // Reset chart title if chart exists
    if (lineChartG) {
        lineChartG.select('.y-axis-label').text('Average Revenue per Movie ($)');
    }
    
    // Update the total revenue label back to default
    const totalRevenueLabel = document.querySelector('#total-revenue').parentElement.querySelector('.stat-label');
    if (totalRevenueLabel) {
        totalRevenueLabel.textContent = 'Total Revenue';
    }
    
    // Update chart title and labels
    updateChartTitleAndLabels();
    
    // Reprocess and update
    processMovieData();
    updateVisualization();
    updateLineChart();
    updateHighBudgetScatter();
    
    // Reset scroll position
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

resetZoomBtn.addEventListener('click', function() {
    resetZoom();
});

inflationBtn.addEventListener('click', function() {
    // Inflation only applies to revenue data, not ratings
    if (mapMetric === "rating") {
        return; // Do nothing for rating mode
    }
    
    adjustForInflation = !adjustForInflation;
    
    // Update button text and style
    if (adjustForInflation) {
        this.textContent = '2025 Dollars (ON)';
        this.className = 'button inflation-button';
        this.style.background = 'linear-gradient(135deg, #28a745 0%, #20a142 100%)';
    } else {
        this.textContent = 'Adjust for Inflation';
        this.className = 'button inflation-button';
        this.style.background = '';
    }
    
    // Update chart title and labels
    updateChartTitleAndLabels();
    
    // Reprocess all data with new inflation setting
    processMovieData();
    
    // Update all visualizations
    updateVisualization();
    updateLineChart();
});

minYearSlider.addEventListener('input', function() {
    minChartYear = +this.value;
    
    // Ensure min year is not greater than max year
    if (minChartYear > maxChartYear) {
        maxChartYear = minChartYear;
        maxYearSlider.value = maxChartYear;
        maxYearValue.textContent = maxChartYear;
    }
    
    minYearValue.textContent = minChartYear;
    updateLineChart();
});

maxYearSlider.addEventListener('input', function() {
    maxChartYear = +this.value;
    
    // Ensure max year is not less than min year
    if (maxChartYear < minChartYear) {
        minChartYear = maxChartYear;
        minYearSlider.value = minChartYear;
        minYearValue.textContent = minChartYear;
    }
    
    maxYearValue.textContent = maxChartYear;
    updateLineChart();
});

chartModeBtn.addEventListener('click', function() {
    chartMode = chartMode === "average" ? "total" : "average";
    
    // Update button text and style based on map metric
    if (mapMetric === "rating") {
        if (chartMode === "total") {
            this.textContent = 'Avg Rating per Year';
            this.className = 'button chart-mode-button';
            this.style.background = 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)';
            this.style.color = '#212529';
        } else {
            this.textContent = 'Movie Count per Year';
            this.className = 'button chart-mode-button';
            this.style.background = '';
            this.style.color = '';
        }
    } else {
        if (chartMode === "total") {
            this.textContent = 'Avg Revenue per Movie';
            this.className = 'button chart-mode-button';
            this.style.background = 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)';
            this.style.color = '#212529';
        } else {
            this.textContent = 'Total Revenue per Year';
            this.className = 'button chart-mode-button';
            this.style.background = '';
            this.style.color = '';
        }
    }
    
    // Update chart title and labels
    updateChartTitleAndLabels();
    
    // Recalculate and update line chart
    updateLineChart();
});

// Function to update chart title and y-axis labels based on current mode
function updateChartTitleAndLabels() {
    const chartTitle = document.getElementById('chart-title');
    
    if (mapMetric === "rating") {
        if (chartMode === "total") {
            chartTitle.textContent = "Movie Count per Year";
        } else {
            chartTitle.textContent = "Average Rating per Year";
        }
        
        // Update chart y-axis label if chart exists
        if (lineChartG) {
            let yAxisLabel;
            if (chartMode === "total") {
                yAxisLabel = 'Number of Movies';
            } else {
                yAxisLabel = 'Average IMDb Rating';
            }
            lineChartG.select('.y-axis-label').text(yAxisLabel);
        }
        
        // Disable inflation button for rating mode
        inflationBtn.style.opacity = '0.5';
        inflationBtn.style.cursor = 'not-allowed';
        inflationBtn.title = 'Inflation adjustment not applicable to ratings';
    } else {
        if (chartMode === "total") {
            chartTitle.textContent = "Total Revenue per Year";
        } else {
            chartTitle.textContent = "Average Revenue per Movie";
        }
        
        // Update chart y-axis label if chart exists
        if (lineChartG) {
            let yAxisLabel;
            if (chartMode === "total") {
                yAxisLabel = adjustForInflation ? 'Total Revenue per Year (2025 $)' : 'Total Revenue per Year ($)';
            } else {
                yAxisLabel = adjustForInflation ? 'Average Revenue per Movie (2025 $)' : 'Average Revenue per Movie ($)';
            }
            lineChartG.select('.y-axis-label').text(yAxisLabel);
        }
        
        // Enable inflation button for revenue mode
        inflationBtn.style.opacity = '1';
        inflationBtn.style.cursor = 'pointer';
        inflationBtn.title = '';
    }
}

// Load data
Promise.all([
    d3.csv("combined_movies_data.csv"),
    d3.json("custom.geo.json")
]).then(([movieData, geoData]) => {
    combined_movies_data = movieData;
    customGeoJSON = geoData;
    
    // Debug: Log the first few rows to understand data structure
    console.log("First 3 rows of movie data:", movieData.slice(0, 3));
    console.log("Available columns:", Object.keys(movieData[0] || {}));
    
    // Process the data
    processMovieData();
    
    // Create the initial visualization
    createMap();
    updateVisualization();
    
    // Create line chart
    createLineChart();
    updateChartTitleAndLabels(); // Set initial chart title and labels
    updateLineChart();
    
}).catch(error => {
    console.error("Error loading data:", error);
    document.getElementById('map-container').innerHTML = 
        '<div style="text-align: center; padding: 2rem; color: #dc3545;">' +
        'Error loading data. Please ensure combined_movies_data.csv and custom.geo.json are in the same directory.' +
        '</div>';
});

// Process movie data by year and country
function processMovieData() {
    movieCountsByYear = {};
    
    if (!combined_movies_data) return;
    
    for (const d of combined_movies_data) {
        const year = +d.Year;
        const rating = +d.Rating;
        const revenueStr = d.grossWorldWWide;
        const voteStr = d.Votes;
        
        // Skip if basic criteria not met
        if (!year || !d.countries_origin || isNaN(rating) || rating < minRating) continue;
        
        // Parse vote count
        let votes = 0;
        if (voteStr) {
            const cleaned = voteStr.trim().toUpperCase();
            if (cleaned.endsWith("K")) {
                votes = parseFloat(cleaned.replace("K", "")) * 1000;
            } else if (cleaned.endsWith("M")) {
                votes = parseFloat(cleaned.replace("M", "")) * 1000000;
            } else {
                votes = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
            }
        }
        
        // Apply vote filter
        if (isNaN(votes) || votes < minVotes) continue;
        
        // Parse revenue
        let revenue = 0;
        if (revenueStr) {
            const cleanedRevenue = revenueStr.replace(/[^0-9.]/g, "");
            revenue = parseFloat(cleanedRevenue) || 0;
        }
        
        // Apply inflation adjustment if enabled
        if (adjustForInflation && revenue > 0) {
            revenue = adjustForInflationAmount(revenue, year);
        }
        
        // Parse countries (the countries_origin field appears to be a string representation of an array)
        let countries;
        try {
            // Replace single quotes with double quotes for valid JSON
            const jsonString = d.countries_origin.replace(/'/g, '"');
            countries = JSON.parse(jsonString);
        } catch (e) {
            // If JSON parsing fails, try eval as last resort (as in original code)
            try {
                countries = eval(d.countries_origin);
            } catch (e2) {
                continue;
            }
        }
        
        // Initialize year data if needed
        if (!movieCountsByYear[year]) movieCountsByYear[year] = {};
        
        // Process each country
        for (let country of countries) {
            // Apply country name fixes
            country = countryNameFixes[country] || country;
            
            if (!movieCountsByYear[year][country]) {
                movieCountsByYear[year][country] = {
                    count: 0,
                    revenue: 0,
                    ratingSum: 0,
                    ratingCount: 0
                };
            }
            
            movieCountsByYear[year][country].count++;
            movieCountsByYear[year][country].revenue += revenue;
            movieCountsByYear[year][country].ratingSum += rating;
            movieCountsByYear[year][country].ratingCount++;
        }
    }
    updateHighBudgetScatter();
}

// Create the map visualization
let svg, g, projection, path, zoom;

function createMap() {
    // Remove loading spinner
    document.getElementById('map-container').innerHTML = '';
    
    const width = document.getElementById('map-container').clientWidth;
    const height = 650;
    
    // Create SVG
    svg = d3.select("#map-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "#f0f8ff");
    
    // Create group for zoom
    g = svg.append("g");
    
    // Setup projection
    projection = d3.geoMercator()
        .scale(150)
        .translate([width / 2, height / 1.5]);
    
    path = d3.geoPath(projection);
    
    // Setup zoom
    zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", () => {
            g.attr("transform", d3.event.transform);
        });
    
    svg.call(zoom);
    
    
    // Draw countries
    g.selectAll("path")
        .data(customGeoJSON.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "country")
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("click", handleCountryClick)
        .on("mouseover", handleMouseOver)
        .on("mousemove", handleMouseMove)
        .on("mouseout", handleMouseOut);
    
    // Add legend
    createLegend();
}

// Update visualization with current filters
function updateVisualization() {
    if (!svg || !customGeoJSON) return;
    
    const data = movieCountsByYear[selectedYear] || {};
    
    // Calculate statistics
    updateStatistics(data);
    
    // Setup color scale
    let maxValue, colorScale;
    if (mapMetric === "count") {
        maxValue = d3.max(Object.values(data), d => d.count || 0) || 1;
        colorScale = d3.scaleSequential(d3.interpolateOranges).domain([0, maxValue]);
    } else {
        maxValue = 10; // IMDb ratings max at 10
        colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, maxValue]);
    }
    
    // Update country colors
    g.selectAll("path")
        .transition()
        .duration(500)
        .attr("fill", d => {
            const record = data[d.properties.name];
            if (!record) return "#eee";
            
            if (mapMetric === "count") {
                return colorScale(record.count);
            } else {
                if (record.ratingCount > 0) {
                    const avgRating = record.ratingSum / record.ratingCount;
                    return colorScale(avgRating);
                }
                return "#eee";
            }
        });
    
    // Update legend
    updateLegend(colorScale, maxValue);
}

// Reset zoom to initial position
function resetZoom() {
    if (!svg) return;
    
    svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
}

// Update summary statistics
function updateStatistics(data) {
    const countries = Object.keys(data);
    const totalMovies = d3.sum(Object.values(data), d => d.count || 0);
    const totalRevenue = d3.sum(Object.values(data), d => d.revenue || 0);
    
    let avgRating = 0;
    if (totalMovies > 0) {
        const totalRatingSum = d3.sum(Object.values(data), d => d.ratingSum || 0);
        const totalRatingCount = d3.sum(Object.values(data), d => d.ratingCount || 0);
        avgRating = totalRatingCount > 0 ? totalRatingSum / totalRatingCount : 0;
    }
    
    totalMoviesEl.textContent = totalMovies.toLocaleString();
    totalCountriesEl.textContent = countries.length;
    avgRatingEl.textContent = avgRating.toFixed(1);
    
    // Update total revenue display with inflation indicator
    const revenueText = totalRevenue > 0 ? 
        '$' + (totalRevenue / 1e9).toFixed(1) + 'B' : 
        'N/A';
    totalRevenueEl.textContent = revenueText;
    
    // Update the label to show if inflation-adjusted
    const totalRevenueLabel = document.querySelector('#total-revenue').parentElement.querySelector('.stat-label');
    if (totalRevenueLabel) {
        totalRevenueLabel.textContent = adjustForInflation ? 'Total Revenue (2025 $)' : 'Total Revenue';
    }
}

// Mouse event handlers
function handleMouseOver(d) {
    d3.select(this)
        .transition()
        .duration(100)
        .attr("stroke-width", 2)
        .attr("stroke", "#000");
}

function handleMouseMove(d) {
    const data = movieCountsByYear[selectedYear] || {};
    const record = data[d.properties.name];
    const totalCount = d3.sum(Object.values(data), d => d.count || 0);

    let content = `<strong>${d.properties.name}</strong><br>`;

    if (!record) {
        content += '<div class="tooltip-row">No data</div>';
    } else {
        const { count, revenue, ratingSum, ratingCount } = record;
        const percent = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : "0.0";
        const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : "N/A";

        let revenueDisplay = "No data available";
        if (revenue > 0) {
            revenueDisplay = revenue >= 1e9 ? (revenue / 1e9).toFixed(1) + 'B'
                              : revenue >= 1e6 ? (revenue / 1e6).toFixed(1) + 'M'
                              : revenue.toLocaleString();
        }
        
        const revenueLabel = adjustForInflation ? "Revenue (2025 $)" : "Revenue";

        content += `
            <div class="tooltip-row">Movies: ${count} (${percent}%)</div>
            <div class="tooltip-row">${revenueLabel}: ${revenueDisplay}</div>
            <div class="tooltip-row">Avg IMDb Rating: ${avgRating}</div>
        `;
    }

    tooltip.innerHTML = content;
    tooltip.style.opacity = 0.9;
    tooltip.style.left = (d3.event.pageX + 10) + "px";
    tooltip.style.top = (d3.event.pageY - 28) + "px";
}

function handleMouseOut(d) {
    d3.select(this)
        .transition()
        .duration(100)
        .attr("stroke-width", 0.5)
        .attr("stroke", "#333");

    tooltip.style.opacity = 0;
}

function handleCountryClick(d) {
    // Update selected country
    selectedCountry = d.properties.name;
    
    // Update country name in the chart header
    document.getElementById('selected-country').textContent = selectedCountry;
    
    // Update line chart
    updateLineChart();
    
    // Smooth scroll to line chart
    const lineChartSection = document.querySelector('#line-chart-container').closest('.viz-container');
    lineChartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Create and update legend
function createLegend() {
    legendGroup = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(20, 550)");
    
    // Background
    legendGroup.append("rect")
        .attr("x", -10)
        .attr("y", -30)
        .attr("width", 280)
        .attr("height", 70)
        .attr("fill", "white")
        .attr("stroke", "#ddd")
        .attr("rx", 8);
}

function updateLegend(colorScale, maxValue) {
    // Clear previous legend content except background
    legendGroup.selectAll(".legend-content").remove();
    
    const legendContent = legendGroup.append("g")
        .attr("class", "legend-content");
    
    // Title
    const title = mapMetric === "count" ? "Movie Count" : "Average Rating";
    legendContent.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-size", "14px")
        .style("font-weight", "600")
        .text(title);
    
    // Create gradient
    const gradientId = "legend-gradient-" + mapMetric;
    const gradient = legendContent.append("defs")
        .append("linearGradient")
        .attr("id", gradientId);
    
    // Add gradient stops
    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
        const t = i / numStops;
        gradient.append("stop")
            .attr("offset", t * 100 + "%")
            .attr("stop-color", colorScale(t * maxValue));
    }
    
    // Draw gradient rect
    legendContent.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 260)
        .attr("height", 15)
        .style("fill", `url(#${gradientId})`);
    
    // Add scale labels
    const formatValue = mapMetric === "count" ? d3.format(",") : d3.format(".1f");
    
    legendContent.append("text")
        .attr("x", 0)
        .attr("y", 30)
        .style("font-size", "12px")
        .text("0");
    
    legendContent.append("text")
        .attr("x", 260)
        .attr("y", 30)
        .style("font-size", "12px")
        .style("text-anchor", "end")
        .text(formatValue(maxValue));
    
    // Add middle value
    legendContent.append("text")
        .attr("x", 130)
        .attr("y", 30)
        .style("font-size", "12px")
        .style("text-anchor", "middle")
        .text(formatValue(maxValue / 2));
}

// Line Chart variables
let lineChartSvg, lineChartG, lineX, lineY, line, trendLine, xAxisLine, yAxisLine;
const lineMargin = {top: 20, right: 30, bottom: 50, left: 80};

// Linear regression calculation
function calculateLinearRegression(data) {
    if (data.length < 2) return null;
    
    const n = data.length;
    const sumX = d3.sum(data, d => d.year);
    const sumY = d3.sum(data, d => d.revenue);
    const sumXY = d3.sum(data, d => d.year * d.revenue);
    const sumXX = d3.sum(data, d => d.year * d.year);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
}

// Create line chart
function createLineChart() {
    const container = document.getElementById('line-chart-container');
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    
    lineChartSvg = d3.select("#line-chart")
        .attr("width", width)
        .attr("height", height);
    
    const innerWidth = width - lineMargin.left - lineMargin.right;
    const innerHeight = height - lineMargin.top - lineMargin.bottom;
    
    lineChartG = lineChartSvg.append("g")
        .attr("transform", `translate(${lineMargin.left}, ${lineMargin.top})`);
    
    // Create scales
    lineX = d3.scaleLinear()
        .domain([minChartYear, maxChartYear])
        .range([0, innerWidth]);
    
    lineY = d3.scaleLinear()
        .range([innerHeight, 0]);
    
    // Create line generator
    line = d3.line()
        .defined(d => !isNaN(d.revenue) && d.revenue !== null)
        .x(d => lineX(d.year))
        .y(d => lineY(d.revenue))
        .curve(d3.curveMonotoneX);
    
    // Create trend line generator
    trendLine = d3.line()
        .x(d => lineX(d.year))
        .y(d => lineY(d.revenue));
    
    // Add grid lines
    lineChartG.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(lineX)
            .tickSize(-innerHeight)
            .tickFormat("")
        );
    
    lineChartG.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(lineY)
            .tickSize(-innerWidth)
            .tickFormat("")
        );
    
    // Create axes
    xAxisLine = lineChartG.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0, ${innerHeight})`);
    
    yAxisLine = lineChartG.append("g")
        .attr("class", "axis y-axis");
    
    // Add axis labels
    lineChartG.append("text")
        .attr("class", "axis-label x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 45)
        .text("Year");
    
    lineChartG.append("text")
        .attr("class", "axis-label y-axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -65)
        .text("Average Revenue per Movie ($)");
    
    // Add line path
    lineChartG.append("path")
        .attr("class", "line-path")
        .attr("stroke", "#667eea");
    
    // Create clipping path for trend line
    lineChartG.append("defs")
        .append("clipPath")
        .attr("id", "trend-line-clip")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", innerWidth)
        .attr("height", innerHeight);
    
    // Add trend line path with clipping
    lineChartG.append("path")
        .attr("class", "trend-line")
        .attr("stroke", "#e74c3c")
        .attr("stroke-dasharray", "5,5")
        .attr("clip-path", "url(#trend-line-clip)");
    
    // Add dots group
    lineChartG.append("g")
        .attr("class", "dots-group");
    
    // Add legend for trend line
    const legend = lineChartG.append("g")
        .attr("class", "chart-legend")
        .attr("transform", `translate(10, 20)`);
    
    // Add background for legend
    legend.append("rect")
        .attr("x", -5)
        .attr("y", -10)
        .attr("width", 85)
        .attr("height", 35)
        .attr("fill", "white")
        .attr("stroke", "#ddd")
        .attr("stroke-width", 1)
        .attr("rx", 4)
        .attr("opacity", 0.9);
    
    // Data line legend
    legend.append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", "#667eea")
        .attr("stroke-width", 2);
    
    legend.append("text")
        .attr("x", 25)
        .attr("y", 4)
        .style("font-size", "12px")
        .style("fill", "#495057")
        .text("Data");
    
    // Trend line legend
    legend.append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", 15)
        .attr("y2", 15)
        .attr("stroke", "#e74c3c")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
    
    legend.append("text")
        .attr("x", 25)
        .attr("y", 19)
        .style("font-size", "12px")
        .style("fill", "#495057")
        .text("Trend");
}

// Calculate rating data for a country (either average rating or movie count per year)
function calculateRatingData(country) {
    const ratingByYear = {};
    
    if (!combined_movies_data) return [];
    
    console.log(`Calculating rating data for: ${country}`);
    let totalProcessed = 0;
    let totalWithRating = 0;
    
    // Calculate rating for each year
    for (const d of combined_movies_data) {
        const year = +d.Year;
        const rating = +d.Rating;
        const voteStr = d.Votes;
        
        // Apply filters
        if (!year || !d.countries_origin || isNaN(rating) || rating < minRating) continue;
        
        // Parse votes
        let votes = 0;
        if (voteStr) {
            const cleaned = voteStr.trim().toUpperCase();
            if (cleaned.endsWith("K")) {
                votes = parseFloat(cleaned.replace("K", "")) * 1000;
            } else if (cleaned.endsWith("M")) {
                votes = parseFloat(cleaned.replace("M", "")) * 1000000;
            } else {
                votes = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
            }
        }
        
        if (isNaN(votes) || votes < minVotes) continue;
        
        // Parse countries
        let countries;
        try {
            const jsonString = d.countries_origin.replace(/'/g, '"');
            countries = JSON.parse(jsonString);
        } catch (e) {
            try {
                countries = eval(d.countries_origin);
            } catch (e2) {
                continue;
            }
        }
        
        // Apply country name fixes and check if this movie includes the selected country
        const fixedCountries = countries.map(c => countryNameFixes[c] || c);
        if (!fixedCountries.includes(country)) continue;
        
        totalProcessed++;
        totalWithRating++;
        
        if (!ratingByYear[year]) {
            ratingByYear[year] = { totalRating: 0, count: 0 };
        }
        ratingByYear[year].totalRating += rating;
        ratingByYear[year].count += 1;
    }
    
    console.log(`Processed ${totalProcessed} movies for ${country}, ${totalWithRating} had rating data`);
    console.log('Rating by year data points:', Object.keys(ratingByYear).length);
    
    // Calculate either average rating per year or total count per year
    const allRatingData = [];
    for (let year = 1925; year <= 2025; year++) {
        if (ratingByYear[year] && ratingByYear[year].count > 0) {
            const dataPoint = {
                year: year,
                count: ratingByYear[year].count
            };
            
            if (chartMode === "total") {
                dataPoint.value = ratingByYear[year].count; // Show movie count
            } else {
                dataPoint.value = ratingByYear[year].totalRating / ratingByYear[year].count; // Show average rating
            }
            
            allRatingData.push(dataPoint);
        }
    }
    
    // Filter data to the selected year range
    const ratingData = allRatingData.filter(d => d.year >= minChartYear && d.year <= maxChartYear);
    
    console.log(`Final rating data points for line chart: ${ratingData.length}`);
    if (ratingData.length > 0) {
        console.log('Sample rating data point:', ratingData[0]);
    }
    
    return ratingData;
}
function calculateRevenueData(country) {
    const revenueByYear = {};
    
    if (!combined_movies_data) return [];
    
    console.log(`Calculating revenue data for: ${country}`);
    let totalProcessed = 0;
    let totalWithRevenue = 0;
    
    // Calculate revenue for each year
    for (const d of combined_movies_data) {
        const year = +d.Year;
        const rating = +d.Rating;
        const voteStr = d.Votes;
        
        // Apply filters
        if (!year || !d.countries_origin || isNaN(rating) || rating < minRating) continue;
        
        // Parse votes
        let votes = 0;
        if (voteStr) {
            const cleaned = voteStr.trim().toUpperCase();
            if (cleaned.endsWith("K")) {
                votes = parseFloat(cleaned.replace("K", "")) * 1000;
            } else if (cleaned.endsWith("M")) {
                votes = parseFloat(cleaned.replace("M", "")) * 1000000;
            } else {
                votes = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
            }
        }
        
        if (isNaN(votes) || votes < minVotes) continue;
        
        // Parse countries
        let countries;
        try {
            const jsonString = d.countries_origin.replace(/'/g, '"');
            countries = JSON.parse(jsonString);
        } catch (e) {
            try {
                countries = eval(d.countries_origin);
            } catch (e2) {
                continue;
            }
        }
        
        // Apply country name fixes and check if this movie includes the selected country
        const fixedCountries = countries.map(c => countryNameFixes[c] || c);
        if (!fixedCountries.includes(country)) continue;
        
        totalProcessed++;
        
        // Parse revenue - be more flexible here
        let revenue = 0;
        if (d.grossWorldWWide) {
            const cleanedRevenue = d.grossWorldWWide.replace(/[^0-9.]/g, "");
            revenue = parseFloat(cleanedRevenue) || 0;
        }
        
        // Apply inflation adjustment if enabled
        if (adjustForInflation && revenue > 0) {
            revenue = adjustForInflationAmount(revenue, year);
        }
        
        // Only include if we have revenue data (much more flexible than requiring both revenue AND budget)
        if (revenue > 0) {
            totalWithRevenue++;
            if (!revenueByYear[year]) {
                revenueByYear[year] = { totalRevenue: 0, count: 0 };
            }
            revenueByYear[year].totalRevenue += revenue;
            revenueByYear[year].count += 1;
        }
    }
    
    console.log(`Processed ${totalProcessed} movies for ${country}, ${totalWithRevenue} had revenue data`);
    console.log('Revenue by year data points:', Object.keys(revenueByYear).length);
    
    // Calculate either average revenue per movie or total revenue per year
    const allRevenueData = [];
    for (let year = 1925; year <= 2025; year++) {
        if (revenueByYear[year] && revenueByYear[year].count > 0) {
            const dataPoint = {
                year: year,
                count: revenueByYear[year].count
            };
            
            if (chartMode === "total") {
                dataPoint.revenue = revenueByYear[year].totalRevenue;
            } else {
                dataPoint.revenue = revenueByYear[year].totalRevenue / revenueByYear[year].count;
            }
            
            allRevenueData.push(dataPoint);
        }
    }
    
    // Filter data to the selected year range
    const revenueData = allRevenueData.filter(d => d.year >= minChartYear && d.year <= maxChartYear);
    
    console.log(`Final data points for line chart: ${revenueData.length}`);
    if (revenueData.length > 0) {
        console.log('Sample data point:', revenueData[0]);
    }
    
    return revenueData;
}

// Update line chart
function updateLineChart() {
    const container = document.getElementById('line-chart-container');
    const width = container.clientWidth;
    const height = container.clientHeight || 400;
    const innerWidth = width - lineMargin.left - lineMargin.right;
    const innerHeight = height - lineMargin.top - lineMargin.bottom;
    
    // Calculate data for selected country based on map metric
    let data;
    let isRatingMode = mapMetric === "rating";
    
    if (isRatingMode) {
        data = calculateRatingData(selectedCountry);
    } else {
        data = calculateRevenueData(selectedCountry);
    }
    
    // Clear existing content if no data
    if (data.length === 0) {
        lineChartG.selectAll(".line-path").attr("d", "");
        lineChartG.selectAll(".trend-line").attr("d", "");
        lineChartG.selectAll(".dot").remove();
        
        // Show no data message
        lineChartG.selectAll(".no-data-text").remove();
        const dataType = isRatingMode ? "rating" : "revenue";
        const noDataText = `No ${dataType} data available for ${selectedCountry}`;
        const yearRangeText = minChartYear === maxChartYear ? 
            ` in ${minChartYear}` : 
            ` from ${minChartYear} to ${maxChartYear}`;
        
        lineChartG.append("text")
            .attr("class", "no-data-text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "#6c757d")
            .text(noDataText + yearRangeText);
        
        // Update y-axis to default scale based on data type
        if (isRatingMode) {
            lineY.domain([0, 10]);
            yAxisLine.transition().duration(500).call(d3.axisLeft(lineY).tickFormat(d => d.toFixed(1)));
        } else {
            lineY.domain([0, 100000000]);
            yAxisLine.transition().duration(500).call(d3.axisLeft(lineY).tickFormat(d => {
                if (d >= 1e9) return "$" + (d / 1e9).toFixed(0) + "B";
                if (d >= 1e6) return "$" + (d / 1e6).toFixed(0) + "M";
                return "$" + d.toLocaleString();
            }));
        }
        
        // Update x-axis to show the selected year range even with no data
        lineX.domain([minChartYear, maxChartYear]);
        xAxisLine.transition().duration(500)
            .call(d3.axisBottom(lineX).tickFormat(d3.format("d")));
        
        // Update clipping path for no-data case
        lineChartG.select("#trend-line-clip rect")
            .attr("width", innerWidth)
            .attr("height", lineY(0));
        
        return;
    }
    
    // Remove no data message
    lineChartG.selectAll(".no-data-text").remove();
    
    // Update x-axis domain - if we have data, use the actual data range for optimal display
    const dataYears = data.map(d => d.year);
    const minDataYear = d3.min(dataYears);
    const maxDataYear = d3.max(dataYears);
    
    // For optimal display, use the actual data range but ensure it's within the selected range
    const xDomainMin = Math.max(minDataYear || minChartYear, minChartYear);
    const xDomainMax = Math.min(maxDataYear || maxChartYear, maxChartYear);
    
    lineX.domain([xDomainMin, xDomainMax]);
    
    // Update scales based on data type
    let maxValue, minValue, padding;
    
    if (isRatingMode) {
        if (chartMode === "total") {
            // Showing movie count
            maxValue = d3.max(data, d => d.value);
            minValue = d3.min(data, d => d.value);
            padding = Math.abs(maxValue - minValue) * 0.1;
            lineY.domain([Math.max(minValue - padding, 0), maxValue + padding]);
        } else {
            // Showing average rating (0-10 scale)
            maxValue = d3.max(data, d => d.value);
            minValue = d3.min(data, d => d.value);
            // For ratings, keep some padding but stay within reasonable bounds
            const paddingValue = 0.5;
            lineY.domain([
                Math.max(minValue - paddingValue, 0), 
                Math.min(maxValue + paddingValue, 10)
            ]);
        }
    } else {
        // Revenue data
        maxValue = d3.max(data, d => d.revenue);
        minValue = d3.min(data, d => d.revenue);
        padding = Math.abs(maxValue - minValue) * 0.1;
        lineY.domain([Math.max(minValue - padding, 0), maxValue + padding]);
    }
    
    // Update axes
    xAxisLine.transition().duration(500)
        .call(d3.axisBottom(lineX).tickFormat(d3.format("d")));
    
    // Update y-axis based on data type
    if (isRatingMode && chartMode === "average") {
        yAxisLine.transition().duration(500)
            .call(d3.axisLeft(lineY).tickFormat(d => d.toFixed(1)));
    } else if (isRatingMode && chartMode === "total") {
        yAxisLine.transition().duration(500)
            .call(d3.axisLeft(lineY).tickFormat(d3.format(",d")));
    } else {
        yAxisLine.transition().duration(500)
            .call(d3.axisLeft(lineY).tickFormat(d => {
                if (d >= 1e9) return "$" + (d / 1e9).toFixed(1) + "B";
                if (d >= 1e6) return "$" + (d / 1e6).toFixed(1) + "M";
                if (d >= 1e3) return "$" + (d / 1e3).toFixed(0) + "K";
                return "$" + d.toLocaleString();
            }));
    }
    
    // Update clipping path to prevent trend line from showing below x-axis
    lineChartG.select("#trend-line-clip rect")
        .attr("width", innerWidth)
        .attr("height", lineY(0));
    
    // Update grid lines to match new axes  
    lineChartG.selectAll(".grid").each(function() {
        const grid = d3.select(this);
        if (grid.attr("transform")) {
            // X-axis grid (has transform attribute)
            grid.transition().duration(500).call(d3.axisBottom(lineX)
                .tickSize(-innerHeight)
                .tickFormat(""));
        } else {
            // Y-axis grid (no transform attribute)
            grid.transition().duration(500).call(d3.axisLeft(lineY)
                .tickSize(-innerWidth)
                .tickFormat(""));
        }
    });
    
    // Update line - use different property based on data type
    const lineGenerator = d3.line()
        .defined(d => !isNaN(d.value || d.revenue) && (d.value || d.revenue) !== null)
        .x(d => lineX(d.year))
        .y(d => lineY(d.value || d.revenue))
        .curve(d3.curveMonotoneX);
    
    lineChartG.select(".line-path")
        .datum(data)
        .transition()
        .duration(500)
        .attr("d", lineGenerator);
    
    // Calculate and update trend line
    const valueData = data.map(d => ({year: d.year, value: d.value || d.revenue}));
    const regression = calculateLinearRegression(valueData.map(d => ({year: d.year, revenue: d.value})));
    
    if (regression && data.length >= 2) {
        // Create trend line data points
        const trendData = [
            { year: xDomainMin, value: regression.slope * xDomainMin + regression.intercept },
            { year: xDomainMax, value: regression.slope * xDomainMax + regression.intercept }
        ];
        
        const trendLineGenerator = d3.line()
            .x(d => lineX(d.year))
            .y(d => lineY(d.value));
        
        lineChartG.select(".trend-line")
            .datum(trendData)
            .transition()
            .duration(500)
            .attr("d", trendLineGenerator);
    } else {
        // Hide trend line if insufficient data
        lineChartG.select(".trend-line")
            .transition()
            .duration(500)
            .attr("d", "");
    }
    
    // Update dots
    const dots = lineChartG.select(".dots-group").selectAll(".dot")
        .data(data, d => d.year);
    
    dots.exit()
        .transition()
        .duration(250)
        .attr("r", 0)
        .remove();
    
    const dotsEnter = dots.enter()
        .append("circle")
        .attr("class", "dot")
        .attr("r", 0)
        .attr("cx", d => lineX(d.year))
        .attr("cy", d => lineY(d.value || d.revenue));
    
    dots.merge(dotsEnter)
        .on("mouseover", function(d) {
            let valueDisplay, valueLabel;
            
            if (isRatingMode) {
                if (chartMode === "total") {
                    valueDisplay = d.value.toLocaleString();
                    valueLabel = "Movies";
                } else {
                    valueDisplay = d.value.toFixed(2);
                    valueLabel = "Average Rating";
                }
            } else {
                const revenue = d.revenue;
                valueDisplay = revenue >= 1e9 ? "$" + (revenue / 1e9).toFixed(2) + "B" :
                             revenue >= 1e6 ? "$" + (revenue / 1e6).toFixed(2) + "M" :
                             "$" + revenue.toLocaleString();
                
                if (chartMode === "total") {
                    valueLabel = adjustForInflation ? "Total Revenue (2025 $)" : "Total Revenue";
                } else {
                    valueLabel = adjustForInflation ? "Avg Revenue (2025 $)" : "Avg Revenue";
                }
            }
            
            tooltip.innerHTML = `
                <strong>${d.year}</strong><br>
                <div class="tooltip-row">${valueLabel}: ${valueDisplay}</div>
                <div class="tooltip-row">Movies: ${d.count}</div>
            `;
            tooltip.style.opacity = 0.9;
            tooltip.style.left = (d3.event.pageX + 10) + "px";
            tooltip.style.top = (d3.event.pageY - 28) + "px";
            
            d3.select(this).transition().duration(100).attr("r", 6);
        })
        .on("mouseout", function() {
            tooltip.style.opacity = 0;
            d3.select(this).transition().duration(100).attr("r", 4);
        })
        .transition()
        .duration(500)
        .attr("cx", d => lineX(d.year))
        .attr("cy", d => lineY(d.value || d.revenue))
        .attr("r", 4)
        .attr("fill", "#667eea")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);
}

// function to turn the money string into a number in USD
function toUSD(moneyStr) {
    // if it's empty, return 0
    if (!moneyStr) {
        return 0;
    }

    // get rid of extra spaces
    var txt = moneyStr.trim();

    // try to match a currency symbol at the start, like $
    var symbolMatch = txt.match(/^([^\d\s\.,]+)/);
    if (symbolMatch) {
        var symbol = symbolMatch[1].toUpperCase();

        // pull out just the number part
        var numeric = parseFloat(txt.replace(/[^0-9\.]/g, ""));
        if (isNaN(numeric)) {
            numeric = 0;
        }

        // look up the exchange rate for that symbol
        var rate = currencyRatesToUSD[symbol];
        if (!rate) {
            rate = 1; // if not found, just default to USD
        }

        // return converted ammount
        return numeric * rate;
    }

    // try a 3 letyter currency code at the end, like USD
    var codeMatch = txt.match(/([A-Z]{3})$/);
    if (codeMatch) {
        var code = codeMatch[1].toUpperCase();

        // again just get the number
        var numericCode = parseFloat(txt.replace(/[^0-9\.]/g, ""));
        if (isNaN(numericCode)) {
            numericCode = 0;
        }

        // look up exchange rate
        var codeRate = currencyRatesToUSD[code];
        if (!codeRate) {
            codeRate = 1;
        }

        // return ammount
        return numericCode * codeRate;
    }

    // if it's not a symbol or a code, just treat is like usd
    var fallback = parseFloat(txt.replace(/[^0-9\.]/g, ""));
    return isNaN(fallback) ? 0 : fallback;
}

// the function to format a number into a short string
function fmtMoney(n) {
    // if it's a billion or more, 
    if (Math.abs(n) >= 1000000000) {
        // return shortenend num w/ B at end, like 1.1B
        return "$" + (n / 1000000000).toFixed(1) + " B";
    }
    // do same for million, 
    if (Math.abs(n) >= 1000000) {
        return "$" + (n / 1000000).toFixed(1) + " M";
    }
    // and thousand
    if (Math.abs(n) >= 1000) {
        return "$" + (n / 1000).toFixed(0) + " K";
    }

    // otherwise just use commas
    return "$" + n.toLocaleString();
}

// the default column to sort by
var currentSortKey   = "BudgetUSD";
// if it's sorting in ascending or descending order
var currentAscending = false;

// function to clean up an format the data, like in stars, writers, ect
function cleanArray(str) {
    // if it's empty, return blank
    if (!str) return "";
    try { // otherwise try to fix the quotes and return and array
        return JSON.parse(str.replace(/'/g, '"')).join(", ");
    } catch {
        // if that fails, just remove manually 
        return str.replace(/[\[\]']+/g, "");
    }
}

// function to draw a scatter plot of budget vs revenue
function updateHighBudgetScatter() {
    // stop if the movie data hasn't loaded yet
    if (!combined_movies_data) {
        return;
    }

    // get the selected year and update the label on the page
    var year = selectedYear;
    document.getElementById("budget-year-label").textContent = year;

    // create an array to hold movie info for the scatter plot
    var movies = [];
    for (var i = 0; i < combined_movies_data.length; i++) {
        var d = combined_movies_data[i];

        // skip this movie if it's not from the selected year
        if (parseInt(d.Year, 10) !== year) {
            continue;
        }

        // converty budget and revenue to numbers in usd
        var budget = toUSD(d.budget);
        var revenue = toUSD(d.grossWorldWWide);
        var rating = parseFloat(d.Rating);

        // skip movied with missing/invalid numbers
        if (budget <= 0 || revenue <= 0 || isNaN(rating)) {
            continue;
        }

        // save cleaned up movies for later
        movies.push({
            Title: d.Title,
            BudgetUSD: budget,
            RevenueUSD: revenue,
            Rating: rating.toFixed(1),
            Country: (d.countries_origin ? d.countries_origin : "").replace(/[\[\]']+/g, ""),
            Description: d.description ? d.description : "",
            Stars: cleanArray(d.stars),
            Writers: cleanArray(d.writers),
            Directors: cleanArray(d.directors),
            Genres: cleanArray(d.genres),
            Languages: cleanArray(d.Languages)
        });
    }

    // sort movies by biggest mudget and keep only top 25
    movies.sort(function(a, b) {
        return b.BudgetUSD - a.BudgetUSD;
    });
    movies = movies.slice(0, 25);

    // set up the chart container size
    var container = document.getElementById("scatter-container");
    var fullWidth = container.clientWidth;
    var margin = { top: 40, right: 40, bottom: 60, left: 80 };
    var width = fullWidth - margin.left - margin.right;
    var height = 500 - margin.top - margin.bottom;

    // only set up the chart once
    if (!scatterSvg) {
        // make the main svg element 
        scatterSvg = d3.select("#scatter-plot")
            .attr("width", fullWidth)
            .attr("height", 500);

        // add a group to hold all chart elements, with padding
        scatterView = scatterSvg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // add white background
        scatterView.append("rect")
            .attr("class", "bg")
            .attr("fill", "white")
            .attr("width", width)
            .attr("height", height);

        // create groups for dots/axes
        dotsScatter = scatterView.append("g").attr("class", "dots");
        xAxisScatterG = scatterView.append("g").attr("class", "x-axis");
        yAxisScatterG = scatterView.append("g").attr("class", "y-axis");

        // add x axis label
        scatterView.append("text")
            .attr("class", "x-label")
            .attr("text-anchor", "middle")
            .attr("y", height + 45)
            .style("font-size", "14px")
            .style("fill", "#495057")
            .text("Budget (USD)");

        // add y axis label
        scatterView.append("text")
            .attr("class", "y-axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -68)
            .style("font-size", "14px")
            .style("fill", "#495057");

        // set up zooming for chart
        scatterZoom = d3.zoom()
            .scaleExtent([0.5, 10])
            .translateExtent([[-width, -height], [2 * width, 2 * height]])
            .on("zoom", zoomed);

        // enable the zoom
        scatterSvg.call(scatterZoom);
    }

    // update chart size if needed
    scatterSvg.attr("width", fullWidth).attr("height", 500);
    scatterView.select(".bg").attr("width", width).attr("height", height);

    // set up x axis scale to use movie budgets using scaleLinear
    xScatter = d3.scaleLinear()
        .domain([0, d3.max(movies, function(d) { return d.BudgetUSD; }) * 1.1])
        .range([0, width])
        .nice();

    // decide what to show on y axis, either revenue or ratio
    var yValue = function(d) {
        if (showProfitRatio) {
            return d.BudgetUSD > 0 ? d.RevenueUSD / d.BudgetUSD : 0;
        } else {
            return d.RevenueUSD;
        }
    };

    // set up the y axis scale using scaleLinear
    yScatter = d3.scaleLinear()
        .domain([0, d3.max(movies, function(d) { return yValue(d); }) * 1.1])
        .range([height, 0])
        .nice();

    // axis formating 
    var xAxis = d3.axisBottom(xScatter).tickFormat(fmtMoney);
    var yAxis;
    if (showProfitRatio) {
        yAxis = d3.axisLeft(yScatter).ticks(6);
        } else {
        yAxis = d3.axisLeft(yScatter).tickFormat(fmtMoney);
    }
    
    // draw x and y axis
    xAxisScatterG
        .attr("transform", "translate(0," + height + ")")
        .transition().duration(500)
        .call(xAxis);
    yAxisScatterG
        .transition().duration(500)
        .call(yAxis);

    // update the label potition/text
    scatterView.select(".x-label").attr("x", width / 2).attr("y", height + 45);
    scatterView.select(".y-axis-label").text(showProfitRatio ? "Revenue ÷ Budget" : "Revenue (USD)");

    // set the movie data to the dots in the chart
    var dots = dotsScatter.selectAll("circle").data(movies, function(d) { return d.Title; });

    // remove old dots
    dots.exit()
        .transition().duration(300)
        .attr("r", 0)
        .remove();

    // add new dots for new data
    var dotsEnter = dots.enter()
        .append("circle")
        .attr("r", 0)
        .attr("fill", "#3498db")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .on("mouseover", function(d) {
            // show tooltip when mouse hover overs a dot
            const event = d3.event;
            d3.select("#movie-tooltip")
            .html(
                "<strong>" + d.Title + "</strong><br>" +
                "<div><strong>Country:</strong> " + (d.Country || "N/A") + "</div>" +
                "<div><strong>Rating:</strong> " + d.Rating + "</div>" +
                "<div><strong>Budget:</strong> " + fmtMoney(d.BudgetUSD) + "</div>" +
                "<div><strong>Revenue:</strong> " + fmtMoney(d.RevenueUSD) + "</div>" +
                (showProfitRatio ? "<div><strong>Revenue ÷ Budget:</strong> " + (d.RevenueUSD / d.BudgetUSD).toFixed(2) + "</div>" : "")
            )
            .style("left", (event.pageX + 12) + "px")
            .style("top", (event.pageY + 12) + "px")
            .style("opacity", 0.95);
        })
        .on("mousemove", function() {
            // move tooltip with the mosue
            var event = d3.event;
            d3.select("#movie-tooltip")
            .style("left", (event.pageX + 12) + "px")
            .style("top", (event.pageY + 12) + "px");
        })
        .on("mouseout", function() {
            // hide the tooltip when the mouse leaves dot
            d3.select("#movie-tooltip").style("opacity", 0);
        });

    // merge new and existign dots, animate
    dots.merge(dotsEnter)
        .transition().duration(500)
        .attr("cx", function(d) { return xScatter(d.BudgetUSD); })
        .attr("cy", function(d) { return yScatter(yValue(d)); })
        .attr("r", 6);

        // helper function that handles zooming in and out 
        function zoomed() {
            var t = d3.event.transform;
            var zx = t.rescaleX(xScatter);
            var zy = t.rescaleY(yScatter);

            // update axes and dot positions while zooming
            xAxisScatterG.call(xAxis.scale(zx));
            yAxisScatterG.call(yAxis.scale(zy));

            dotsScatter.selectAll("circle")
                .attr("cx", function(d) { return zx(d.BudgetUSD); })
                .attr("cy", function(d) { return zy(yValue(d)); });
        }
}


function resetScatterZoom() {
    const svg = d3.select("#scatter-plot");
    if (!svg || !scatterZoom) return;

    svg.transition()
        .duration(750)
        .call(scatterZoom.transform, d3.zoomIdentity);
}

document.getElementById("scatter-reset-btn").addEventListener("click", resetScatterZoom);
document.getElementById("toggle-profit-ratio").addEventListener("change", function (e) {
    showProfitRatio = e.target.checked;
    updateHighBudgetScatter(); // re-render chart with new mode
});



// Handle window resize
window.addEventListener('resize', debounce(() => {
    if (!svg) return;
    
    // Resize map
    const width = document.getElementById('map-container').clientWidth;
    const height = 650;
    
    svg.attr("width", width).attr("height", height);
    projection.translate([width / 2, height / 1.5]);
    
    g.selectAll("path").attr("d", path);
    
    // Resize line chart
    if (lineChartSvg) {
        const lineContainer = document.getElementById('line-chart-container');
        const lineWidth = lineContainer.clientWidth;
        const lineHeight = lineContainer.clientHeight || 400;
        const innerWidth = lineWidth - lineMargin.left - lineMargin.right;
        const innerHeight = lineHeight - lineMargin.top - lineMargin.bottom;
        
        lineChartSvg.attr("width", lineWidth).attr("height", lineHeight);
        lineX.range([0, innerWidth]);
        
        // Update x-axis domain to current data range (this will be set by updateLineChart)
        // but we need to maintain the current domain during resize
        
        // Update axes
        xAxisLine.call(d3.axisBottom(lineX).tickFormat(d3.format("d")));
        
        // Update grid
        lineChartG.select(".grid").call(d3.axisBottom(lineX)
            .tickSize(-innerHeight)
            .tickFormat("")
        );
        
        // Update axis label positions
        lineChartG.select(".x-axis-label")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 45);
        
        lineChartG.select(".y-axis-label")
            .attr("x", -innerHeight / 2)
            .attr("y", -65);
        
        // Update clipping path dimensions for resize
        lineChartG.select("#trend-line-clip rect")
            .attr("width", innerWidth);
        
        // Update line and dots
        updateLineChart();
        updateHighBudgetScatter();
    }
}, 250));

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}