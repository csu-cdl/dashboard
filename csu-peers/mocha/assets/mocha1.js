$(document).ready(function()	{
	// Various accessors that specify the four dimensions of data to visualize.
	function x(d) { return d.gradrate; }
	function y(d) { return d.gap; }
	function radius(d) { return d.pell; }
	function color(d) { return d.campus; }
	function key(d) { return d.campus; }

	// Chart dimensions.
	var margin = {top: 19.5, right: 200, bottom: 19.5, left: 39.5},
		width = 860 - margin.right,
		height = 400 - margin.top - margin.bottom;

	// Various scales. These domains make assumptions of data, naturally.
	var xScale = d3.scale.linear().domain([10, 80]).range([0, width]),
		yScale = d3.scale.linear().domain([-15, 25]).range([height, 0]),
		radiusScale = d3.scale.sqrt().domain([0, 75]).range([0, 25]),
		colorScale = d3.scale.category20();
	var formatPercent = d3.format(".0%");
	var excluded_groups = [];
	
	// The x & y axes.
	var xAxis = d3.svg.axis().orient("bottom").scale(xScale).ticks(12).tickFormat(function(d) { return parseInt(d, 10) + "%"; }).tickSize(-height),
		yAxis = d3.svg.axis().scale(yScale).orient("left").tickFormat(function(d) { return parseInt(d, 10) + "%"; }).tickSize(-width);

	// Create the SVG container and set the origin.
	var svg = d3.select("#chart").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		
	//Tooltip
	var tooltip = d3.select("body")
		.append("div")
		.attr("class", "tooltip")
		.style("position", "absolute")
		.style("z-index", "10")
		.style("visibility", "hidden");

	// Add the x-axis.
	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height +")")
		.call(xAxis);

	// Add the y-axis.
	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis);

	// Add an x-axis label.
	svg.append("text")
		.attr("class", "x label")
		.attr("text-anchor", "end")
		.attr("x", width)
		.attr("y", height - 6)
		.text("Graduation Rate");

	// Add a y-axis label.
	svg.append("text")
		.attr("class", "y label")
		.attr("text-anchor", "end")
		.attr("y", 6)
		.attr("dy", ".75em")
		.attr("transform", "rotate(-90)")
		.text("Achievement Gap");

	// Add the year label; the value is set on transition.
	var label = svg.append("text")
		.attr("class", "year label")
		.attr("text-anchor", "end")
		.attr("y", height - 35)
		.attr("x", width)
		.text(2000);
	
	// Load the data. 
	d3.json("data/mocha_campus.json", function(error, data) {
	
		if (error) return console.warn(error);
		console.log(data);

		// A bisector since many nation's data is sparsely-defined.
		var bisect = d3.bisector(function(d) { return d[0]; });
		
		
		// Add a dot per nation. Initialize the data at 1800, and set the colors.
		var dot = svg.append("g")
			.attr("class", "dots")
			.selectAll(".dot")
			.data(interpolateData(2000))
			.enter().append("circle")
			.attr("class", "dot")
			.attr("id", function(d) { return "tag" + d.campus.replace(/\s+/g, '') })
			.style("fill", function(d) { return colorScale(color(d)); })
			.style("stroke", function(d) { return colorScale(color(d)); })
			.call(position)
			.sort(order)
			
			
			 .on("mouseover", function(d) {
				tooltip.html("");
				tooltip.append("h3").attr("class", "tooltip_title")
				.style("background-color", colorScale(color(d)))
				tooltip.append("pre").attr("class", "tooltip_body");
				tooltip.select(".tooltip_title")
				.text(d.campus);
				
				tooltip.select(".tooltip_body")
				.text(
					"Achievement Gap: " + "\u00A0\u00A0" + Math.round(d.gap) + "%\n" + 
					"Graduation Rate: " + "\u00A0\u00A0" + Math.round(d.gradrate) + "%\n" + 
					"Total FTF Freshmen: " + "\u00A0\u00A0" + Math.round(d.total) + "\n" +
					"Percent Pell: " + "\u00A0\u00A0" + Math.round(d.pell) + "%\n" 
					);

					return tooltip.style("visibility", "visible");
					})
					
				.on("mousemove", function() {
					return tooltip.style("top", (d3.event.pageY-52) + "px").style("left", (d3.event.pageX+25) + "px");
				})
				
				.on("mouseout", function() {
					return tooltip.style("visibility", "hidden");
				});


			
		$("button").on("click", function() {
			update();
		});
		
		
		$("#slider").on("change", function(){
			svg.transition().duration(0);
			displayYear($("#slider").val());
		});
	
		var update = function() {  
			// Add a dot per nation. Initialize the data at 1800, and set the colors.
			d3.selectAll(".dot")
			.call(position)
			.sort(order);

			// Add a title.
			dot.append("title")
				.text(function(d) { return d.campus; });

			// Start a transition that interpolates the data based on year.
			svg.transition()
				.duration(6000)
				.ease("linear")
				.tween("year", tweenYear)
		};//update function

			
		// Positions the dots based on data.
		function position(dot) {
			 dot .attr("cx", function(d) { return xScale(x(d)); })
				.attr("cy", function(d) { return yScale(y(d)); })
				.attr("r", function(d) { return radiusScale(radius(d)); });
		}

		// Defines a sort order so that the smallest dots are drawn on top.
		function order(a, b) {
			return radius(b) - radius(a);
		}


		// Tweens the entire chart by first tweening the year, and then the data.
		// For the interpolated data, the dots and label are redrawn.
		function tweenYear() {
			var year = d3.interpolateNumber(2000, 2007);
			return function(t) { displayYear(year(t)); };
		}

		// Updates the display to show the specified year.
		function displayYear(year) {
			dot.data(interpolateData(year), key).call(position).sort(order);
			label.text(Math.round(year));
			$("#slider").val(Math.round(year));
			$(".tooltip_title").text(Math.round(year));
		}

		// Interpolates the dataset for the given (fractional) year.
		function interpolateData(year) {
			return data.map(function(d) {
			return {
				campus: d.campus,
				pell: interpolateValues(d.pell, year),
				gradrate: interpolateValues(d.gradrate, year),
				gap: interpolateValues(d.gap, year),
				total: interpolateValues(d.total, year),
				};
			});
		}

		// Finds (and possibly interpolates) the value for the specified year.
		function interpolateValues(values, year) {
			var i = bisect.left(values, year, 0, values.length - 1),
				a = values[i];
			if (i > 0) {
			var b = values[i - 1],
				t = (year - a[0]) / (b[0] - a[0]);
			return a[1] * (1 - t) + b[1] * t;
				}
			return a[1];
		}
	
		var legend = svg.selectAll(".legend")
			.data(data)
			.enter().append("g")
			.attr("class", "legend")
			.attr("transform", function(d, i) { return "translate(6," + i * 14 + ")"; });
		
		
		legend.append("rect")
			.attr("x", width)
			.attr("width", 12)
			.attr("height", 12)
			.style("fill", function(d) { return colorScale(color(d)); });

		legend.append("text")
			.attr("x", width + 16)
			.attr("y", 6)
			.attr("dy", ".35em")
			.style("text-anchor", "start")
			.text(function(d) { return d.campus; });
			
		legend.on("mouseover", function(d) {
			d3.selectAll(".legend")
				.style("opacity", 0.1);
			d3.select(this)
				.style("opacity", 1);
		  	d3.selectAll(".dot")
				.style("opacity", 0.1)
			d3.selectAll("#tag"+d.campus.replace(/\s+/g, ''))
				.style("opacity", 1);
			})
			
		.on("mouseout", function(type) {
			d3.selectAll(".legend")
				.style("opacity", .7);
			d3.selectAll(".dot")
				.style("opacity", 1);
		});

	});//data function
	
});//ready