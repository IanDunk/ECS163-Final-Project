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
    inflationBtn.style.backgroundColor = '#6c757d';
    inflationBtn.style.borderColor = '#6c757d';
    inflationBtn.style.color = 'white';
    
    // Reset chart mode button
    chartModeBtn.textContent = 'Total Revenue per Year';
    chartModeBtn.style.backgroundColor = '#17a2b8';
    chartModeBtn.style.borderColor = '#17a2b8';
    chartModeBtn.style.color = 'white';
    
    // Reset chart title
    document.getElementById('chart-title').textContent = 'Average Revenue per Movie';
    
    // Reset chart title if chart exists
    if (lineChartG) {
        lineChartG.select('.y-axis-label').text('Average Revenue per Movie ($)');
    }
    
    // Reprocess and update
    processMovieData();
    updateVisualization();
    updateLineChart();
    
    // Reset scroll position
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

resetZoomBtn.addEventListener('click', function() {
    resetZoom();
});

inflationBtn.addEventListener('click', function() {
    adjustForInflation = !adjustForInflation;
    
    // Update button text and style
    if (adjustForInflation) {
        this.textContent = '2025 Dollars (ON)';
        this.style.backgroundColor = '#28a745';
        this.style.borderColor = '#28a745';
        this.style.color = 'white';
    } else {
        this.textContent = 'Adjust for Inflation';
        this.style.backgroundColor = '#6c757d';
        this.style.borderColor = '#6c757d';
        this.style.color = 'white';
    }
    
    // Update chart title if chart exists
    if (lineChartG) {
        let yAxisLabel;
        if (chartMode === "total") {
            yAxisLabel = adjustForInflation ? 'Total Revenue per Year (2025 $)' : 'Total Revenue per Year ($)';
        } else {
            yAxisLabel = adjustForInflation ? 'Average Revenue per Movie (2025 $)' : 'Average Revenue per Movie ($)';
        }
        lineChartG.select('.y-axis-label').text(yAxisLabel);
    }
    
    // Recalculate and update line chart
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
    
    // Update button text and style
    if (chartMode === "total") {
        this.textContent = 'Avg Revenue per Movie';
        this.style.backgroundColor = '#ffc107';
        this.style.borderColor = '#ffc107';
        this.style.color = '#212529';
    } else {
        this.textContent = 'Total Revenue per Year';
        this.style.backgroundColor = '#17a2b8';
        this.style.borderColor = '#17a2b8';
        this.style.color = 'white';
    }
    
    // Update chart title
    const chartTitle = document.getElementById('chart-title');
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
    
    // Recalculate and update line chart
    updateLineChart();
});

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
        .attr("stroke", d => d.properties.name === selectedCountry ? "#667eea" : "#333")
        .attr("stroke-width", d => d.properties.name === selectedCountry ? 3 : 0.5)
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
        })
        .attr("stroke-width", function(d) {
            return d.properties.name === selectedCountry ? 3 : 0.5;
        })
        .attr("stroke", function(d) {
            return d.properties.name === selectedCountry ? "#667eea" : "#333";
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
    totalRevenueEl.textContent = totalRevenue > 0 ? 
        '$' + (totalRevenue / 1e9).toFixed(1) + 'B' : 
        'N/A';
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

        let revenueDisplay = "Unknown";
        if (revenue > 0) {
            revenueDisplay = revenue >= 1e9 ? (revenue / 1e9).toFixed(1) + 'B'
                              : revenue >= 1e6 ? (revenue / 1e6).toFixed(1) + 'M'
                              : revenue.toLocaleString();
        }

        content += `
            <div class="tooltip-row">Movies: ${count} (${percent}%)</div>
            <div class="tooltip-row">Revenue: ${revenueDisplay}</div>
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
    
    // Highlight selected country
    g.selectAll("path")
        .attr("stroke-width", function(data) {
            return data.properties.name === selectedCountry ? 3 : 0.5;
        })
        .attr("stroke", function(data) {
            return data.properties.name === selectedCountry ? "#667eea" : "#333";
        });
    
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
const lineMargin = {top: 20, right: 30, bottom: 50, left: 70};

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
        //.y(d => lineY(Math.max(0, d.revenue)));
    
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
        .attr("x", -innerHeight / 2 )
        .attr("y", -60)
        .text("Average Revenue per Movie ($)");
    
    // Add line path
    lineChartG.append("path")
        .attr("class", "line-path")
        .attr("stroke", "#667eea");
    
    // Add trend line path
    lineChartG.append("path")
        .attr("class", "trend-line")
        .attr("stroke", "#e74c3c");
    
    // Add dots group
    lineChartG.append("g")
        .attr("class", "dots-group");
    
    // Add legend for trend line
    const legend = lineChartG.append("g")
        .attr("class", "chart-legend")
        .attr("transform", `translate(${innerWidth - 150}, 20)`);
    
    // Data line legend
    legend.append("line")
        .attr("x1", 75)
        .attr("x2", 95)
        .attr("y1", -30)
        .attr("y2", -30)
        .attr("stroke", "#667eea")
        .attr("stroke-width", 2);
    
    legend.append("text")
        .attr("x", 100)
        .attr("y", -25)
        .style("font-size", "12px")
        .style("fill", "#495057")
        .text("Data");
    
    // Trend line legend
    legend.append("line")
        .attr("x1", 75)
        .attr("x2", 95)
        .attr("y1", -10)
        .attr("y2", -10)
        .attr("stroke", "#e74c3c")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
    
    legend.append("text")
        .attr("x", 100)
        .attr("y", -5)
        .style("font-size", "12px")
        .style("fill", "#495057")
        .text("Trend");
}

// Calculate revenue data for a country (either average per movie or total per year)
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
    
    // Calculate data for selected country
    const data = calculateRevenueData(selectedCountry);
    
    // Clear existing content if no data
    if (data.length === 0) {
        lineChartG.selectAll(".line-path").attr("d", "");
        lineChartG.selectAll(".trend-line").attr("d", "");
        lineChartG.selectAll(".dot").remove();
        
        // Show no data message
        lineChartG.selectAll(".no-data-text").remove();
        const noDataText = `No revenue data available for ${selectedCountry}`;
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
        
        // Update y-axis to default scale
        lineY.domain([0, 100000000]);
        yAxisLine.transition().duration(500).call(d3.axisLeft(lineY).tickFormat(d => {
            if (d >= 1e9) return "$" + (d / 1e9).toFixed(0) + "B";
            if (d >= 1e6) return "$" + (d / 1e6).toFixed(0) + "M";
            return "$" + d.toLocaleString();
        }));
        
        // Update x-axis to show the selected year range even with no data
        lineX.domain([minChartYear, maxChartYear]);
        xAxisLine.transition().duration(500)
            .call(d3.axisBottom(lineX).tickFormat(d3.format("d")));
        
        return;
    }
    
    // Remove no data message
    lineChartG.selectAll(".no-data-text").remove();
    
    // Update x-axis domain - if we have data, use the actual data range for optimal display
    // otherwise, use the full selected range
    const dataYears = data.map(d => d.year);
    const minDataYear = d3.min(dataYears);
    const maxDataYear = d3.max(dataYears);
    
    // For optimal display, use the actual data range but ensure it's within the selected range
    const xDomainMin = Math.max(minDataYear || minChartYear, minChartYear);
    const xDomainMax = Math.min(maxDataYear || maxChartYear, maxChartYear);
    
    lineX.domain([xDomainMin, xDomainMax]);
    
    // Update scales for revenue
    const maxRevenue = d3.max(data, d => d.revenue);
    const minRevenue = d3.min(data, d => d.revenue);
    const padding = Math.abs(maxRevenue - minRevenue) * 0.1;
    
    lineY.domain([
        Math.max(minRevenue - padding, 0), // Don't go below 0 for revenue
        maxRevenue + padding
    ]);
    
    // Update axes
    xAxisLine.transition().duration(500)
        .call(d3.axisBottom(lineX).tickFormat(d3.format("d")));
    
    yAxisLine.transition().duration(500)
        .call(d3.axisLeft(lineY).tickFormat(d => {
            if (d >= 1e9) return "$" + (d / 1e9).toFixed(1) + "B";
            if (d >= 1e6) return "$" + (d / 1e6).toFixed(1) + "M";
            if (d >= 1e3) return "$" + (d / 1e3).toFixed(0) + "K";
            return "$" + d.toLocaleString();
        }));
    
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
    
    // Update line
    lineChartG.select(".line-path")
        .datum(data)
        .transition()
        .duration(500)
        .attr("d", line);
    
    // Calculate and update trend line
    const regression = calculateLinearRegression(data);
    if (regression && data.length >= 2) {
        // Create trend line data points
        const trendData = [
            { year: xDomainMin, revenue: regression.slope * xDomainMin + regression.intercept },
            { year: xDomainMax, revenue: regression.slope * xDomainMax + regression.intercept }
        ];
        
        //created new const to stop trendline from dipping below x axis
        const positiveTrendData = trendData.map(d=> ({
            ...d,
            revenue: Math.max(0, d.revenue)
        }));

        lineChartG.select(".trend-line")
            .datum(positiveTrendData)
            //.datum(trendData)
            .transition()
            .duration(500)
            .attr("d", trendLine);
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
        .attr("cy", d => lineY(d.revenue));
    
    dots.merge(dotsEnter)
        .on("mouseover", function(d) {
            const revenue = d.revenue;
            const revenueDisplay = revenue >= 1e9 ? "$" + (revenue / 1e9).toFixed(2) + "B" :
                                 revenue >= 1e6 ? "$" + (revenue / 1e6).toFixed(2) + "M" :
                                 "$" + revenue.toLocaleString();
            
            let revenueLabel;
            if (chartMode === "total") {
                revenueLabel = adjustForInflation ? "Total Revenue (2025 $)" : "Total Revenue";
            } else {
                revenueLabel = adjustForInflation ? "Avg Revenue (2025 $)" : "Avg Revenue";
            }
            
            tooltip.innerHTML = `
                <strong>${d.year}</strong><br>
                <div class="tooltip-row">${revenueLabel}: ${revenueDisplay}</div>
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
        .attr("cy", d => lineY(d.revenue))
        .attr("r", 4)
        .attr("fill", "#667eea")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);
}

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
            .attr("x", -innerHeight / 2);
        
        // Update line and dots
        updateLineChart();
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

