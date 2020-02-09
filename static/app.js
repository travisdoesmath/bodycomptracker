var svg = d3.select(".svg-container")
    .append("svg")
    .style("width", "100%")
    .style("height", "100%")
    .classed("svg-content", true);

var svgBBox = svg.node().getBoundingClientRect()

var height = svgBBox.height,
    width = svgBBox.width;

svg
// .attr("preserveAspectRatio", "xMinYMin meet")
.attr("viewBox", `0 0 ${width} ${height}`)


var margin = {
    top: 10,
    right: 10, 
    bottom: 40,
    left: 30
}

var axisBreakHeight = 30;

var chartWidth = width - margin.left - margin.right;
var chartHeight = height - margin.top - margin.bottom;


var g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

var defs = svg.append("defs")

defs.append("pattern")
    .attr("id","lightstripe")
    .attr("patternUnits","userSpaceOnUse")
    .attr("width", "5")
    .attr("height", "5")
    .append("image")
        .attr("xlink:href","data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc1JyBoZWlnaHQ9JzUnPgogIDxyZWN0IHdpZHRoPSc1JyBoZWlnaHQ9JzUnIGZpbGw9J3doaXRlJy8+CiAgPHBhdGggZD0nTTAgNUw1IDBaTTYgNEw0IDZaTS0xIDFMMSAtMVonIHN0cm9rZT0nIzg4OCcgc3Ryb2tlLXdpZHRoPScxJy8+Cjwvc3ZnPg==")
        .attr("x","0")
        .attr("y","0")
        .attr("width","5")
        .attr("height","5")


    .select("svg")

function renderCharts(data, subsetFunction) {

    subset = data.filter(subsetFunction);

    weightMin = Math.floor(d3.min(subset, d => d.weight_lb)/5)*5;
    weightMax = Math.ceil(d3.max(subset, d => d.weight_lb)/5)*5;
    leanMassMin = Math.floor(d3.min(subset, d => d.lean_mass_lb)/5)*5;
    leanMassMax = Math.ceil(d3.max(subset, d => d.lean_mass_lb)/5)*5;

    var xScale = d3.scaleTime()
        .domain(d3.extent(subset, d => d.measured_at))
        .range([0, chartWidth])

    var breakpoint = chartHeight * 2/3 - (chartHeight * 2/3 - axisBreakHeight) * (leanMassMax - leanMassMin) / ((weightMax - weightMin) + (leanMassMax - leanMassMin))

    yScale = d3.scaleLinear()
        .domain([leanMassMin, leanMassMax, weightMin, weightMax])
        .range([(chartHeight - 2 * axisBreakHeight) * 2/3, breakpoint, breakpoint - axisBreakHeight,0])

    bfpYScale = d3.scaleLinear()
        .domain(d3.extent(subset, d => d.fat_percent))
        .range([chartHeight, (chartHeight - 2 * axisBreakHeight) * 2/3 + axisBreakHeight])

    // yScale = d3.scaleLinear()
    //     .domain([leanMassMin, leanMassMax, weightMin, weightMax])
    //     .range([200, 100, 90, 0])

    // bfpYScale = d3.scaleLinear()
    //     .domain(d3.extent(subset, d => d.fat_percent))
    //     .range([200, 0])

    var xAxis = d3.axisBottom(xScale);
    var yAxis = d3.axisLeft(yScale)
        .tickValues(d3.range(leanMassMin, leanMassMax + 5, 5).concat(d3.range(weightMin, weightMax + 5, 5)));
    var bfpYAxis = d3.axisLeft(bfpYScale)
        .tickFormat(d3.format(".0%"))

    var yGridlines = d3.axisLeft(yScale).tickValues(yAxis.tickValues()).tickSize(-chartWidth).tickFormat("")
    var bfpYGridlines = d3.axisLeft(bfpYScale).tickValues(bfpYAxis.tickValues()).tickSize(-chartWidth).tickFormat("")
    var xGridlines = d3.axisBottom(xScale).tickValues(xAxis.tickValues()).tickSize((chartHeight - 2 * axisBreakHeight) * 2/3).tickFormat("")
    var bfpXGridlines = d3.axisBottom(xScale).tickValues(xAxis.tickValues()).tickSize((chartHeight - 2 * axisBreakHeight) * 1/3).tickFormat("")
    //var bfpXGridlines = d3.axisBottom(xScale).tickValues(xAxis.tickValues()).tickSize(0).tickFormat("")

    g.selectAll(".grid-y").data([0]).enter().append("g")
        .classed("grid-y", true)
        .classed("grid", true)
    g.selectAll(".grid-y").transition().call(yGridlines)

    g.selectAll(".grid-x").data([0]).enter().append("g")
        .classed("grid-x", true)
        .classed("grid", true)
    g.selectAll(".grid-x").transition().call(xGridlines)

    g.selectAll(".bfp-grid-y").data([0]).enter().append("g")
        .classed("bfp-grid-y", true)
        .classed("grid", true)
    g.selectAll(".bfp-grid-y").transition().call(bfpYGridlines)

    g.selectAll(".bfp-grid-x").data([0]).enter().append("g")
        .classed("bfp-grid-x", true)
        .classed("grid", true)
        .attr("transform", `translate(0, ${(chartHeight - 2 * axisBreakHeight) * 2/3 + axisBreakHeight})`)
    g.selectAll(".bfp-grid-x").transition().call(bfpXGridlines)
    
    var weightLine = d3.line()
        .x(d => xScale(d.measured_at))
        .y(d => yScale(d.smooth_weight_lb))

    var leanMassLine = d3.line()
        .x(d => xScale(d.measured_at))
        .y(d => yScale(d.smooth_lean_mass_lb))

    var bfpLine = d3.line()
        .x(d => xScale(d.measured_at))
        .y(d => bfpYScale(d.smooth_fat_percent))

    var weightObs = g.selectAll(".weight").filter(".obs")
        .data(subset, d => d.measured_at)

    weightObs.exit()
        .remove()

    weightObs.enter()
        .append("circle")
        .classed("weight", true)
        .classed("obs", true)
        .attr("r", 2)
        .attr("fill", "none")
        .attr("stroke", "#EE0")
        .merge(weightObs)
        .transition()
        .attr("cx", d => xScale(d.measured_at))
        .attr("cy", d => yScale(d.weight_lb))

    var leanMassObs = g.selectAll(".leanmass").filter(".obs")
        .data(subset, d => d.measured_at + d.lean_mass_lb)

    leanMassObs.exit().remove()

    leanMassObs.enter()
        .append("circle")
        .classed("leanmass", true)
        .classed("obs", true)
        .attr("r", 2)
        .attr("fill", "none")
        .attr("stroke", "#F80")
        .merge(leanMassObs)
        .transition()
        .attr("cx", d => xScale(d.measured_at))
        .attr("cy", d => yScale(d.lean_mass_lb))

    var bfpObs = g.selectAll(".bfp").filter(".obs")
        .data(subset)

    bfpObs.exit().remove()

    bfpObs.enter()
        .append("circle")
        .classed("bfp", true)
        .classed("obs", true)
        .attr("r", 2)
        .attr("fill", "none")
        .attr("stroke", "#F40")
        .merge(bfpObs)
        .transition()
        .attr("cx", d => xScale(d.measured_at))
        .attr("cy", d => bfpYScale(d.fat_percent))

    weightLineElement = g.selectAll(".line-weight").data([subset])

    weightLineElement.enter()
        .append("path")
        .classed("line-weight", true)
        .style("stroke", "#EE0")
        .merge(weightLineElement)
        .transition()
        .attr("d", weightLine)

    leanMassLineElement = g.selectAll(".line-leanmass").data([subset])
        
    leanMassLineElement.enter()
        .append("path")
        .attr("class", "line-leanmass")
        .style("stroke", "#F80")
        .merge(leanMassLineElement)
        .transition()
        .attr("d", leanMassLine)            

    bfpLineElement = g.selectAll(".line-bfp").data([subset])
        
    bfpLineElement.enter()
        .append("path")
        .attr("class", "line-bfp")
        .style("stroke", "#E20")
        .merge(bfpLineElement)
        .attr("d", bfpLine)
        

    g.selectAll(".axis-y").data([0]).enter().append("g")
        .classed("axis-y", true)
    g.selectAll(".axis-y").transition().call(yAxis)

    g.selectAll(".bfp-axis-y").data([0]).enter().append("g")
        .classed("bfp-axis-y", true)
    g.selectAll(".bfp-axis-y").transition().call(bfpYAxis)

    g.selectAll(".axis-x").data([0]).enter().append("g")
        .classed("axis-x", true)
        .attr("transform", `translate(0, ${chartHeight})`)
    g.selectAll(".axis-x").transition().call(xAxis)

    g.selectAll(".break").data([0]).enter().append("rect")
        .classed("break", true)
        .attr("fill", "url(#lightstripe)")
        .attr("opacity", 0.25)
    g.selectAll(".break")
        .transition()
        .attr("x", 0)
        .attr("width", chartWidth)
        .attr("y", breakpoint - axisBreakHeight)
        .attr("height", axisBreakHeight)
}

function renderData(data) {
    var weekInMilliseconds = 7 * 24 * 60 * 60 * 1000

    var current = data[data.length - 1]

    currentWeight = current.smooth_weight_lb
    currentLeanMass = current.smooth_lean_mass_lb
    currentBFP = 1 - currentLeanMass/currentWeight

    var numberOfPointsRecordedInTheLastWeek = data.filter(d => moment(d.measured_at) > moment().subtract(1, 'week')).length

    var weekAgoPoint1 = data[data.length - (numberOfPointsRecordedInTheLastWeek + 2)],
        weekAgoPoint2 = data[data.length - (numberOfPointsRecordedInTheLastWeek + 1)];

    var weekAgo = moment(current.measured_at).subtract(1, 'week')

    var trendPoint = {
        smooth_fat_percent:  weekAgoPoint1.smooth_fat_percent  + (weekAgoPoint2.smooth_fat_percent  - weekAgoPoint1.smooth_fat_percent)  * (weekAgo - weekAgoPoint1.measured_at) / (weekAgoPoint2.measured_at),
        smooth_lean_mass_lb: weekAgoPoint1.smooth_lean_mass_lb + (weekAgoPoint2.smooth_lean_mass_lb - weekAgoPoint1.smooth_lean_mass_lb) * (weekAgo - weekAgoPoint1.measured_at) / (weekAgoPoint2.measured_at),
        smooth_weight_lb:    weekAgoPoint1.smooth_weight_lb    + (weekAgoPoint2.smooth_weight_lb    - weekAgoPoint1.smooth_weight_lb)    * (weekAgo - weekAgoPoint1.measured_at) / (weekAgoPoint2.measured_at)
    }

    weightTrend = (current.smooth_weight_lb - trendPoint.smooth_weight_lb) 
    leanMassTrend = (current.smooth_lean_mass_lb - trendPoint.smooth_lean_mass_lb)
    bfpTrend = (current.smooth_fat_percent - trendPoint.smooth_fat_percent)

    now = new Date()
    birthday = new Date(1980, 1, 3)
    age = (now - birthday) / (1000 * 60 * 60 * 24 * 365.25)

    BMR_mifflin_st_jeor = 10*(currentWeight * 0.453592) + 6.25*(66*2.54) - 5*age + 5
    BMR_katch_mcardle = 370 + (21.6*currentLeanMass * 0.453592)

    d3.select("#weight").html(`Weight<h3>${currentWeight.toFixed(1)}&nbsp;lbs (${(weightTrend > 0) ? '+' : ''}${weightTrend.toFixed(1)})</h3>`)
    d3.select("#lean-mass").html(`LBM<h3>${currentLeanMass.toFixed(1)}&nbsp;lbs (${(leanMassTrend > 0) ? '+' : ''}${leanMassTrend.toFixed(1)})</h3>`)
    d3.select("#bfp").html(`BFP<h3>${currentBFP.toLocaleString(undefined, {style: 'percent', minimumFractionDigits:1})} (${(bfpTrend > 0) ? '+' : ''}${bfpTrend.toLocaleString(undefined, {style: 'percent', minimumFractionDigits:1})})</h3>`)
    d3.select("#bmr").html(`BMR<h3>${50*Math.round(BMR_katch_mcardle/50).toFixed()} kcal</h3>`)
}

function processData(data) {
    data = data.filter(d => d.lean_mass_lb < 200)

    data = data.filter(function(item, index) {
        return data.map(d => d.measured_at).indexOf(item.measured_at) >= index;
    })

    data.forEach(element => {
        element.measured_at = d3.isoParse(element.measured_at)
        element.fat_percent /= 100;
        element.smooth_fat_percent /= 100;
    });

    data.sort((a, b) => a.measured_at - b.measured_at)

    return data;
}



d3.json("/smooth_measurements").then(function(data) {
    data = processData(data);
    
    globalData = data;

    renderCharts(data, d => moment(d.measured_at) > moment().subtract(6, 'months'))

    renderData(data)

})

d3.select("#one-month").on("click", () => renderCharts(globalData, d => moment(d.measured_at) > moment().subtract(1, 'months')))
d3.select("#three-months").on("click", () => renderCharts(globalData, d => moment(d.measured_at) > moment().subtract(3, 'months')))
d3.select("#six-months").on("click", () => renderCharts(globalData, d => moment(d.measured_at) > moment().subtract(6, 'months')))
d3.select("#one-year").on("click", () => renderCharts(globalData, d => moment(d.measured_at) > moment().subtract(1, 'years')))
d3.select("#two-year").on("click", () => renderCharts(globalData, d => moment(d.measured_at) > moment().subtract(2, 'years')))
d3.select("#all").on("click", () => renderCharts(globalData, d => moment(d.measured_at) > moment('2016-08-01')))
