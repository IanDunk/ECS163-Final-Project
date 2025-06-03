// Global variables
let combined_movies_data = null;
let customGeoJSON = null;
let movieCountsByYear = {};

// Filter state
let selectedYear = 2025;
let minRating = 7;
let minVotes = 10000;
let mapMetric = "count"; // "count" or "rating"

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
});

votesSlider.addEventListener('input', function() {
    minVotes = +this.value;
    votesValue.textContent = minVotes.toLocaleString();
    processMovieData();
    updateVisualization();
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
    
    // Update UI
    yearSlider.value = selectedYear;
    yearValue.textContent = selectedYear;
    ratingSlider.value = minRating;
    ratingValue.textContent = minRating.toFixed(1);
    votesSlider.value = minVotes;
    votesValue.textContent = minVotes.toLocaleString();
    document.getElementById('metric-count').checked = true;
    
    // Reprocess and update
    processMovieData();
    updateVisualization();
});

resetZoomBtn.addEventListener('click', function() {
    resetZoom();
});

// Load data
Promise.all([
    d3.csv("combined_movies_data.csv"),
    d3.json("custom.geo.json")
]).then(([movieData, geoData]) => {
    combined_movies_data = movieData;
    customGeoJSON = geoData;
    
    // Process the data
    processMovieData();
    
    // Create the initial visualization
    createMap();
    updateVisualization();
    
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
        } catch {
            // If JSON parsing fails, try eval as last resort (as in original code)
            try {
                countries = eval(d.countries_origin);
            } catch {
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
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
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
        const revenueDisplay = revenue > 0 ? 
            '$' + (revenue >= 1e9 ? (revenue / 1e9).toFixed(1) + 'B' : 
                   revenue >= 1e6 ? (revenue / 1e6).toFixed(1) + 'M' : 
                   revenue.toLocaleString()) : 
            "Unknown";
        
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

// Create and update legend
let legendGroup;

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

// Handle window resize
window.addEventListener('resize', debounce(() => {
    if (!svg) return;
    
    const width = document.getElementById('map-container').clientWidth;
    const height = 650;
    
    svg.attr("width", width).attr("height", height);
    projection.translate([width / 2, height / 1.5]);
    
    g.selectAll("path").attr("d", path);
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