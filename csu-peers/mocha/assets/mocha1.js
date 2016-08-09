$(document).ready(function () {


	// Various accessors that specify the four dimensions of data to visualize.
	var x = function (d) {
		return d[cs.dimension_map.x[0]];
	};
	var y = function (d) {
		return d[cs.dimension_map.y[0]];
	};
	var radius = function (d) {
		return d[cs.dimension_map.radius[0]];
	};
	var color = function (d) {
		return d[cs.dimension_map.color[0]];
	};
	var key = function (d) {
		return d[cs.dimension_map.key[0]];
	};

	var maketag = function (campus) {
		return 'tag' + campus.replace(/\s+/g, '');
	};

	var build_chart = function () {
		// Create the SVG container and set the origin.
		var svg = d3.select('#chart1-plotarea').append('svg')
			.attr('width', cs.width + cs.margin.left + cs.margin.right)
			.attr('height', cs.height + cs.margin.top + cs.margin.bottom)
			.append('g')
			.attr('transform', 'translate(' + cs.margin.left + ',' + cs.margin.top + ')');

		// Create the Axes
		var xAxis = d3.svg.axis().orient('bottom').scale(cs.scale.x).ticks(12).tickFormat(function (d) {
			return parseInt(d, 10) + '%';
		}).tickSize(-cs.height - 6);
		
		var yAxis = d3.svg.axis().scale(cs.scale.y).orient('left').tickFormat(function (d) {
			return parseInt(d, 10) + '%';
		}).tickSize(-cs.width - 6);
		
		// Add the x-axis.
		svg.append('g')
			.attr('class', 'x axis')
			.attr('transform', 'translate(0,' + (cs.height + 6) + ')')
			.call(xAxis);

		// Add the y-axis.
		svg.append('g')
			.attr('class', 'y axis')
			.attr('transform', 'translate(-6, 0)')
			.call(yAxis);

		// Add an x-axis label.
		svg.append('text')
			.attr('class', 'x label')
			.attr('text-anchor', 'end')
			.attr('x', cs.width)
			.attr('y', cs.height + 38)
			.text(cs.label[cs.dimension_map.x[0]]);

		// Add a y-axis label.
		svg.append('text')
			.attr('class', 'y label')
			.attr('text-anchor', 'end')
			.attr('y', -52)
			.attr('dy', '.75em')
			.attr('transform', 'rotate(-90)')
			.text(cs.label[cs.dimension_map.y[0]]);

		return svg;
	};

	var create_tooltip = function () {
		//Tooltip
		var tooltip = d3.select('body')
			.append('div')
			.attr('class', 'tooltip')
			.style('position', 'absolute')
			.style('z-index', '10')
			.style('visibility', 'hidden');
		return tooltip;
	};

	var plot_data = function (svg, data) {
		var tooltip = create_tooltip();

		// Add the year label; the value is set on transition.
		var label = svg.append('text')
			.attr('class', 'year label')
			.attr('text-anchor', 'end')
			.attr('y', cs.height - 35)
			.attr('x', cs.width)
			.text(cs.label.year);

		// Tweens the entire chart by first tweening the year, and then the data.
		// For the interpolated data, the dots and label are redrawn.
		var tweenYear = function () {
			var year = d3.interpolateNumber(cs.year_start, cs.year_end);
			return function(t) { displayYear(year(t)); };
		};

		// Updates the display to show the specified year.
		var displayYear = function (year) {
			dot.data(interpolateData(year), key).call(position).sort(order);
			label.text(Math.round(year));
			$('#slider').val(Math.round(year));
			$('.tooltip_title').text(Math.round(year));
		};

		// Interpolates the dataset for the given (fractional) year.
		var interpolateData = function (year) {
			return data.map(function (d) {
			return {
				campus: d.campus,
				pell: interpolateValues(d.pell, year),
				gradrate: interpolateValues(d.gradrate, year),
				gap: interpolateValues(d.gap, year),
				total: interpolateValues(d.total, year),
				};
			});
		};

		// A bisector since many item's data is sparsely-defined.
		var bisect = d3.bisector(function (d) { return d[0]; });

		// Finds (and possibly interpolates) the value for the specified year.
		var interpolateValues = function (values, year) {
			var i = bisect.left(values, year, 0, values.length - 1),
				a = values[i];
			if (i > 0) {
			var b = values[i - 1],
				t = (year - a[0]) / (b[0] - a[0]);
			return a[1] * (1 - t) + b[1] * t;
				}
			return a[1];
		};

		// Positions the dots based on data.
		var position = function (dot) {
			 dot .attr('cx', function (d) { return cs.scale.x(x(d)); })
				.attr('cy', function (d) { return cs.scale.y(y(d)); })
				.attr('r', function (d) { return Math.abs(cs.scale.radius(radius(d))); }); // can't have negative radius
		};

		// Defines a sort order so that the smallest dots are drawn on top.
		var order = function (a, b) {
			return radius(b) - radius(a);
		};

		// Add a dot per item. Initialize the data and set the colors.
		var dot = svg.append('g')
			.attr('class', 'dots')
			.selectAll('.dot')
			.data(interpolateData(cs.year_start))
			.enter().append('circle')
			.attr('class', 'dot')
			.attr('id', function (d) {return maketag(d.campus);})
			.style('fill', function (d) { return cs.scale.color(color(d)); })
			.style('stroke', function (d) { return cs.scale.color(color(d)); })
			.call(position)
			.sort(order)
			.on('mouseover', function (d) {
				tooltip.html('');
				tooltip.append('h3').attr('class', 'tooltip_title')
				.style('background-color', cs.scale.color(color(d)))
				tooltip.append('pre').attr('class', 'tooltip_body');
				tooltip.select('.tooltip_title')
				.text(d.campus);
				
				tooltip.select('.tooltip_body')
				.text(cs.templates.tooltip
					.replace('{gap}', Math.round(d.gap))
					.replace('{gradrate}', Math.round(d.gradrate))
					.replace('{ftf}', Math.round(d.total))
					.replace('{pell}', Math.round(d.pell))
					);

					return tooltip.style('visibility', 'visible');
					})
					
				.on('mousemove', function () {
					return tooltip.style('top', (d3.event.pageY - 52) + 'px').style('left', (d3.event.pageX + 25) + 'px');
				})
				.on('mouseout', function () {
					return tooltip.style('visibility', 'hidden');
				});

		var update = function () {  
			// Add a dot per item. Initialize the data and set the colors.
			d3.selectAll('.dot')
			.call(position)
			.sort(order);

			// Add a title.
			dot.append('title')
				.text(function (d) { return d.campus; });

			// Start a transition that interpolates the data based on year.
			svg.transition()
				.duration(cs.duration)
				.ease('linear')
				.tween('year', tweenYear)
		}; //update function

		$('button').on('click', function () {
			update();
		});

		$('#slider').on('change', function (){
			svg.transition().duration(0);
			displayYear($('#slider').val());
		});

		Object.keys(cs.campuses).forEach(function (el) {
			if (cs.campuses[el].selected) {
				d3.selectAll('#' + maketag(el)).style('opacity', 1);
			} else {
				d3.selectAll('#' + maketag(el)).style('opacity', 0.08);
			}
		});
	};

	var create_legend = function (svg, data) {
		var legend = svg.selectAll('.legend')
			.data(data)
			.enter().append('g')
			.attr('class', 'legend')
			.attr('transform', function (d, i) { return 'translate(20,' + i * 17 + ')'; });

		legend.append('rect')
			.attr('x', cs.width)
			.attr('width', 12)
			.attr('height', 12)
			.style('fill', function(d) { return cs.scale.color(color(d)); });

		legend.append('text')
			.attr('x', cs.width + 16)
			.attr('y', 5)
			.attr('dy', '.4em')
			.style('text-anchor', 'start')
			.text(function (d) { return d.campus; });

		legend.on('mouseover', function (d) {
			d3.selectAll('.legend')
				.style('opacity', 0.1);
			d3.select(this)
				.style('opacity', 1);
			d3.selectAll('.dot')
				.style('opacity', 0.1);
			d3.selectAll('#' + maketag(d.campus))
				.style('opacity', 1);
			})
			.on('click', function (d, i) {
				if (!cs.campuses[d.campus].selected) {
					cs.campuses[d.campus].selected = true;
					d3.select(this).attr('fill', '#f00');
				} else {
					cs.campuses[d.campus].selected = false;
					d3.select(this).attr('fill', '#000');
				}
			})
			.on('mouseout', function(type) {
				d3.selectAll('.legend')
					.style('opacity', .7);
				d3.selectAll('.dot')
					.style('opacity', 1);
				Object.keys(cs.campuses).forEach(function (el) {
					if (cs.campuses[el].selected) {
						d3.selectAll('#' + maketag(el)).style('opacity', 1);
					} else {
						d3.selectAll('#' + maketag(el)).style('opacity', 0.08);
					}
				});
			});
	};

	var set_selection = function (svg) {
		Object.keys(cs.campuses).forEach(function (el) {
			if (cs.campuses[el].selected) {
				d3.selectAll('#' + maketag(el)).style('opacity', 1);
			} else {
				d3.selectAll('#' + maketag(el)).style('opacity', 0.08);
			}
			d3.selectAll('.legend').attr('fill', function (d) {var color = '#000'; if (cs.campuses[d.campus].selected) {color = '#f00'} return color;});
		});
	};

	//var retained_data;
	var load_data = function (url, callback) {
		if (!cs.retained_data) {
			d3.json(url, function (data) {
				cs.retained_data = data;
				callback(data);
			});
		} else {
			callback(cs.retained_data);
		}
	};

	var svg;
	var init = function () {
		cs.width = $(window).width() * 0.85 - 200;
		cs.scale.x = d3.scale.linear().domain(cs.dimension_map.x.slice(1)).range([0, cs.width]);
		cs.scale.y = d3.scale.linear().domain(cs.dimension_map.y.slice(1)).range([cs.height, 0]);
		cs.scale.radius = d3.scale.sqrt().domain(cs.dimension_map.radius.slice(1)).range([0, cs.radius]);
		cs.scale.color = d3.scale.category20();

		// once the data is completely loaded, plot data points and generate legend
		load_data(cs.data_url, function (data) {
			svg = build_chart();
			plot_data(svg, data);
			create_legend(svg, data);
		});
	};

	init();
	cs.update_plot = function () {set_selection(svg)};
});//ready