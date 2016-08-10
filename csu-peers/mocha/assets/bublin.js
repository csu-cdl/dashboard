(function () {
	'use strict';

	var cs = { // chart_state
		dimension_map: {'x': ['gradrate', 10, 80], 'y': ['gap', -15, 25], 'radius': ['pell', 0, 75], 'color': ['campus'], 'key': ['campus']}, // alter mapping to switch data-plot dimensions
		margin: {top: 20, right: 200, bottom: 40, left: 60},
		width: 900,
		height: 360,
		radius: 25,
		scale: {'x': 0, 'y': 0, 'radius': 0, 'color': 0},
		fmt_percent: d3.format('.0%'),
		label: {'gradrate': 'Graduation Rate', 'gap': 'Achievement Gap', 'year': '2000', 'pell': 'Pell'},
		year_start: 2000,
		year_end: 2007,
		duration: 6000,
		templates: {
			tooltip: 'Achievement Gap: \u00A0\u00A0{gap}%\nGraduation Rate: \u00A0\u00A0{gradrate}%\nTotal FTF Freshmen: \u00A0\u00A0{ftf}\nPercent Pell: \u00A0\u00A0{pell}%\n'
		},
		data_url: 'data/mocha_campus.json',
		campuses: {
			'Bakersfield': {selected: false},
			'Channel Islands': {selected: false},
			'Chico': {},
			'Dominguez Hills': {selected: false},
			'East Bay': {selected: false},
			'Fresno': {selected: false},
			'Fullerton': {selected: false},
			'Humboldt': {selected: false},
			'Long Beach': {selected: false},
			'Los Angeles': {selected: false},
			'Monterey Bay': {selected: false},
			'Northridge': {selected: false},
			'Pomona': {selected: false},
			'Sacramento': {selected: false},
			'San Bernardino': {selected: false},
			'San Diego': {selected: false},
			'San Francisco': {selected: false},
			'San Jose': {selected: false},
			'San Luis Obispo': {selected: false},
			'San Marcos': {selected: false},
			'Sonoma': {selected: false},
			'Stanislaus': {selected: false}
		},
		retained_data: null
	};

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
	var plot_update;
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
			var aa = cs.campuses[a.campus].selected ? 1000 : 2000; // force selected campus dots to rise to top of z-order
			var bb = cs.campuses[b.campus].selected ? 1000 : 2000;
			return radius(b) + bb - radius(a) - aa;
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

		var update = function (mode) {  
			// Add a dot per item. Initialize the data and set the colors.
			d3.selectAll('.dot')
			.call(position)
			.sort(order);

			// Add a title.
			dot.append('title')
				.text(function (d) { return d.campus; });

			if (!mode) {
				// Start a transition that interpolates the data based on year.
				svg.transition()
					.duration(cs.duration)
					.ease('linear')
					.tween('year', tweenYear)
			}
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
		plot_update = function () {update(true);};
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
				plot_update();
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
						d3.selectAll('#' + maketag(el)).style('opacity', 0.09);
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
		if (cs.retained_data !== null) {
			callback(cs.retained_data);
		} else {
			d3.json(url, function (data) {
				cs.retained_data = data;
				callback(data);
			});
		}
	};

	var svg;
	var init_bubble = function () {
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

	/*
	 * Begin Line Chart
	 */

	var chart_state ={
		'yvalue': 'gap',
		'palette': ["#f00", "#0f3", "#00f", "#0df", "#f0f", "#fe0", "#f90", "#b3a", "#f3a", "#60f", "#0af", "#0dc", "#6da", "#6ad", "#a6d", "#ad6", "#da6", "#d6a", "#6a6", "#a6a", "#a66", "#66a", "#aa6", "#6aa", "#06a", "#6a0"]
	};
	Highcharts.setOptions({
		colors: chart_state.palette
	});
	var series_state = {};

	var create_chart = function (config, data) {
		var fmt1 = config.tooltip_label + ': {point.y:.0f}%<br/>Campus: {series.name}';
		var txt1 = config.axis_y_title;
		$('#chart0').highcharts({
			credits: {
				enabled: false
			},
			chart: {
				type: 'line'
			},
			title: {
				text: ''
			},
			subtitle: {
				text: ''
			},
			xAxis: {
				type: 'category',
				labels: {
					style: {
						fontSize: '13px',
						fontFamily: 'Verdana, sans-serif'
					}
				}
			},
			yAxis: {
				title: {
					text: txt1
				}
			},
			legend: {
				enabled: false
			},
			tooltip: {
				pointFormat: fmt1
			},
			legend: {
				title: {style: {'color': '#777'}, text: '(Click to show/hide campuses)'},
				layout: 'horizontal',
				align: 'center',
				verticalAlign: 'bottom',
				itemWidth: 200,
				labelFormatter: function () {
					var name = this.name;
					if (name === 'all') { // hide gray LinkedTo all item legend element
						return;
					}
					return name;
				}
			},
			series: data
		});
	};

	var load_data = function (config, callback) {
		if (cs.retained_data !== null) {
			callback(cs.retained_data, config);
		} else {
			$.ajax({
				url: 'data/mocha_campus.json',
				datatype: "json",
				success: function (result) {
					var json_object = (typeof result === 'string')
						? JSON.parse(result)
						: result;
					cs.retained_data = json_object;
					callback(cs.retained_data, config);
				}
			});
		}
	};

	var update_series = function (mode) {
		var pchart = $('#chart0').highcharts();
		if (pchart) {
			pchart.series.forEach(function (e) {
				var attributes = e.userOptions;
				if (attributes.zIndex === 2) {
					if (!mode) {
						// get selected
						if (cs.campuses[e.userOptions.name].selected) {
							series_state[e.userOptions.name] = true;
							e.userOptions.visible = true;
						} else {
							series_state[e.userOptions.name] = false;
							e.userOptions.visible = false;
						}
					} else {
						// set selected
						cs.campuses[e.userOptions.name].selected = e.userOptions.visible;
					}
				}
			});
		}
		return series_state;
	};
	
	var update_chart = function (config) {
		load_data(config, function (data, config) {
			var multiseries = [];
			var multigray = [];
			var attribute = chart_state.yvalue;
			var null_series = [];
			var series_state = update_series();
			data.forEach(function (campus_data) {
				var series = [];
				var campus = campus_data.campus;
				campus_data[attribute].forEach(function (item, i) {
					var key = item[0];
					var value = item[1];
					series.push({'name': key, 'y': value});
					if (null_series.length < i) {
						null_series.push(null);
					}
				});
				multiseries.push({'name': campus, 'data': series.slice(), 'zIndex':2, 'lineWidth':2, 'visible':series_state[campus]||false});
				multigray.push({'name': campus, 'data': series.slice(), 'linkedTo': 'gray', 'color': '#dedede', 'zIndex':1, 'lineWidth':1});
			});
			multiseries.push({'name': 'all', 'id': 'gray', 'data': null_series, 'color': 'transparent'});
			create_chart(config, multiseries.concat(multigray));
		});
	};

	var init = function () {
		var config = {axis_y_title: '% Achievement Gap', tooltip_label: 'Gap'};
		$('.tabtab li').on('click', function (e) {
			var tabid = e.target.nodeName === 'LI' ? e.target.id : e.target.parentNode.id;
			if (tabid === 'line') {
				update_chart(config); // get selected
				$('#panel0').show();
				$('#panel1').hide();
				if ($('#chart0').highcharts()) {
					$('#chart0').highcharts().reflow();
				}
			} else { // bubble
				update_series(1); // set selected
				set_selection(svg);
				plot_update();
				$('#panel1').show();
				$('#panel0').hide();
			}
		});
		$('#yvalue_selector').on('change', function (e) {
			update_series(1); // set selected
			var value = e.target.value;
			chart_state.yvalue = {'gap':'gap', 'pell':'pell', 'gradrate':'gradrate'}[value];
			config.axis_y_title = {'gap': '% Achievement Gap', 'pell': '% Pell Eligible Enrollment', 'gradrate': '% 6-Year Grad Rate'}[value];
			config.tooltip_label = {'gap': 'Gap', 'pell': 'Pell Enrollment', 'gradrate': 'Grad Rate'}[value];
			update_chart(config);
		});
		$('#panel0').hide();
		$('#panel1').show();
	};
	$(document).ready(function () {
		init();
		init_bubble();
	});

}());