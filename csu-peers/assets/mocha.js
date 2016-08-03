$(document).ready(function()	{

	/*
	 * Begin new enhancements library functions
	 *
	 *
	 *
	 */


	var create_flyout_selector = function (container, label, default_item, items, callback) {
		// add button
		var toggle = false;
		var btn = container
			.append("button")
			.attr("class","flyout_menu")
			.on("click",function () {
				menu.style("visibility","visible");
				toggle = !toggle;
				if (!toggle) {menu.style("visibility","hidden")}
			})
			.text("");

		var lbl = container
			.append("label")
			.attr("class","flyout_label")
			.text(label);

		// add flyout menu
		var menu = container
			.append("ul")
			.style("visibility","hidden")
			.attr("class","flyout_menu");

		// add menu items
		items.forEach(function (el,i,a) {
			menu.append("li")
					.on("click",function () {
						btn.text(el[0]);
						//console.log(el[1]);
						callback(el[1]);
						toggle = false;
						menu.style("visibility","hidden");
					})
					.text(el[0]);
		});
		//TODO: Reduce O() complexity of search for default item:
		items.forEach(function (el) {
			if (el[0] === default_item) {
				btn.text(el[0]);
				callback(el[1]);
			}
		});
		return container;
	};

	var change_ticks = function (g,lohi,marks) {
		if (marks[0] === 0) {
			g[0].style("opacity",0);
			g[1].style("opacity",0);
		} else {
			g[0].style("opacity",1);
			g[1].style("opacity",1);
			var yScale = d3.scale.linear()
				.domain(lohi)
				.range([60,4]);

			g[0].call(d3.svg.axis().orient("right").scale(yScale).ticks(marks[0]));
			g[1].call(d3.svg.axis().orient("right").scale(yScale).ticks(marks[1]));
		}
		return g;
	};

	var create_color_legend = function (container) {
		spectrum = container
			.append("div")
			.attr("class","spectrum");

		var vticks = container
			.append("div")
			.attr("class","axis2 vticks");
			
		var vticks_minor = container
			.append("div")
			.attr("class","axis2 vticks_minor");

		var add_ticks = function (el, w, h) {
			var svg = el.append("svg")
				.attr("width",w)
				.attr("height",h);

			return svg.append("g");
		};

		var el0 = add_ticks(vticks,40,70);
		var el1 = add_ticks(vticks_minor,40,70);
		change_ticks([el0,el1],[10,70],[2,7]); // initialize
		return [el0,el1,spectrum];
	};

	var create_size_legend = function (container) {
		var arc = d3.svg.arc()
				.innerRadius(30)
				.outerRadius(32)
				.startAngle(-1.6)
				.endAngle(1.2);

		var arcsize = container.append("div")
				.attr("class","arcsize");

		var svg3 = arcsize.append("svg")
				.attr("width",90)
				.attr("height",70);

		var gg = svg3.append("g");
		// initialize
		gg.append("path")
			.style("fill","#aaa")
			.attr("d",arc)
			.attr("transform","translate(43,43)");
		var tt = gg.append("text")
			.attr("x",58)
			.attr("y",46)
			.text('5000');

		return [gg,tt];
	};

	/*
	 * End new enhancements library functions
	 *
	 */








	// TODO: generate this list from min/max of source data
	var size_items = [['Same Size',[null,'','same',75,75]],['% Pell',[65,'80','pell',0,80]],['6-yr Graduation Rate %',[65,'80','gradrate',0,80]],['Achievement Gap %',[65,'23','gap',0,23]]];//,['Total # FTF Freshman',[58,'5000','ftf',1000,5000]]];
	var size_legend = create_size_legend(d3.select("#size_flyout"));

		
	// TODO: generate this list from min/max of source data
	var color_items = [['Same Color',[0,0,0,7]],['Unique Colors',[0,0,0,7]],['% Pell',[10,70,2,7]],['6-yr Graduation Rate %',[40,75,2,7]],['Achievement Gap %',[-10,20,2,7]]];//,['Total # FTF Freshman',[1400,4200,2,7]]];
	var color_legend = create_color_legend(d3.select("#color_flyout"));
		
	var xy_items = [['% Pell',[65,'80','pell',10,80,'Pell']],['6-yr Graduation Rate %',[65,'80','gradrate',10,80,'Graduation Rate']],['Achievement Gap %',[65,'23','gap',-15,25,'Acheivement Gap']]];//,['Total # FTF Freshman',[58,'5000','ftf',1000,5000]]];
		
	// Various accessors that specify the four dimensions of data to visualize.
	var size_dimension = {'metric':'pell','domain':[0,80]};
	var x_dimension = {'metric':'gradrate','':[10,80]};
	var y_dimension = {'metric':'gap','':[-10,25]};
	var radius = function (d) {
		return d[size_dimension.metric];
	};
	// TODO: generate this list programatically
	var campus_color_map = {
		"Bakersfield":"bb88ff",
		"Channel Islands":"ccaa88",
		"Chico":"dd8899",
		"Dominguez Hills":"ffbbaa",
		"East Bay":"99ffbb",
		"Fresno":"ffcc77",
		"Fullerton":"ddbbff",
		"Humboldt":"66ddc3",
		"Long Beach":"6a73cf",
		"Los Angeles":"44eecc",
		"Monterey Bay":"88ee44",
		"Northridge":"ff6666",
		"Pomona":"44ccee",
		"Sacramento":"77aaee",
		"San Bernardino":"ee7799",
		"San Diego":"44ee77",
		"San Francisco":"ff88dd",
		"San Jose":"88ccaa",
		"San Luis Obispo":"77ddbb",
		"San Marcos":"4488ff",
		"Sonoma":"ee88ff",
		"Stanislaus":"77eeff",
	}
	//console.log(JSON.stringify([d['campus'],campus_color_map[d['campus']]]));

	//var color = function (d) {
	//	var metric = 'campus';
	//	if (size_dimension.metric === 'pell' || size_dimension.metric === 'gap') { // only limiting for test
	//		metric = size_dimension.metric;
	//	}
	//	return d[metric];
	//};
	var x = function (d) {
		return d[x_dimension.metric];
	};
	var y = function (d) {
		return d[y_dimension.metric];
	};
	//function x(d) { return d.gradrate; }
	//function y(d) { return d.gap; }
	//function radius(d) { return d['pell']; }
	function color(d) { return d.campus; }
	function key(d) { return d.campus; }
		

	// Chart dimensions.
	var margin = {top: 19.5, right: 200, bottom: 19.5, left: 39.5};
	var width = 860 - margin.right;
	var height = 400 - margin.top - margin.bottom;
	// Various scales. These domains make assumptions of data, naturally.
	var xScale = d3.scale.linear().domain([10, 80]).range([0, width]);
	var yScale = d3.scale.linear().domain([-15, 25]).range([height, 0]);

	var radiusScale = d3.scale.sqrt().domain(size_dimension.domain).range([0, 30]);
	//var radiusScale = d3.scale.sqrt().domain([0,80]).range([0, 30]);
	var colorScale = function  (d) {
		//console.log(JSON.stringify(['colorScale',d,campus_color_map[d]]));//i,campus_color_map[d['campus']]]));
		return campus_color_map[d];//d['campus']];
	}//d3.scale.category20();
	var formatPercent = d3.format(".0%");
	var excluded_groups = [];
	
	// The x & y axes.
	var xAxis = d3.svg.axis().orient("bottom").scale(xScale)
				.ticks(12)
				.tickFormat(function(d) { return parseInt(d, 10) + "%"; }).tickSize(-height);
	var yAxis = d3.svg.axis().orient("left").scale(yScale)
				.tickFormat(function(d) { return parseInt(d, 10) + "%"; }).tickSize(-width);

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
	var xxAxis = svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height +")")
		.call(xAxis);

	// Add the y-axis.
	var yyAxis = svg.append("g")
		.attr("class", "y axis")
		.call(yAxis);

	// Add an x-axis label.
	var xxLabel = svg.append("text")
		.attr("class", "x label")
		.attr("text-anchor", "end")
		.attr("x", width)
		.attr("y", height - 6)
		.text("Graduation Rate");

	// Add a y-axis label.
	var yyLabel = svg.append("text")
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
		//console.log(data);

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
			.style("fill", function(d) { 
				//console.log(JSON.stringify(['DOTS',d,color(d),colorScale(color(d))]))
				return colorScale(color(d)); 
			})
			.style("stroke", function(d) { return colorScale(color(d)); })
			.call(position)
			.sort(order)
			
			
			 .on("mouseover", function() {
				tooltip.html("");
				var d = this["__data__"];
				tooltip.append("h3").attr("class", "tooltip_title")
				.style("background-color", "#" + campus_color_map[d.campus])
				// (function () {
				//	console.log(JSON.stringify(['TOOLTIP',d,color(d),colorScale(color(d))]));
				//	return colorScale(color(d));
				//})())
				tooltip.append("pre").attr("class", "tooltip_body");
				tooltip.select(".tooltip_title")
				.text(d.campus);
				
				tooltip.select(".tooltip_body")
				.text(
					//"Year: " + year + "\n" +
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


			
		$("#play").on("click", function() {
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
				.style("fill", function(d) { 
					return campus_color_map[d['campus']];
					//return colorScale(color(d)); 
				})
				.style("stroke", function(d) { 
					//console.log(JSON.stringify(['STROKE',d]));
					return campus_color_map[d['campus']];
					//return colorScale(color(d)); 
				})
				.attr("r", function(d) {
					if (size_dimension.metric === 'same') {
						return radiusScale(size_dimension.domain[1]);
					}
					return radiusScale(Math.abs(radius(d))); 
				});
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
		
/*
		legend.append("rect")
			.attr("x", width)
			.attr("width", 12)
			.attr("height", 12)
			.style("fill", function(d) { 
				//console.log(JSON.stringify(['LEGEND',d,color(d),colorScale(color(d))]))
				return colorScale(color(d)); 
			})

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
*/
		// select dimension of data to use as size (radius)
		var f2 = create_flyout_selector(
			d3.select("#size_flyout"),	// html element into which this widget is placed
			'Circle Size', 			// widget label
			'% Pell',				// default selection
			size_items, 			// data
			function (item) {		// callback with item selected as arg
				var gg = size_legend[0], tt = size_legend[1];
				if (item[0] !== null) {
					gg.attr("opacity",1);
					tt.attr("x",item[0]).text(item[1]);
				} else {
					gg.attr("opacity",0);
				}
				size_dimension = {"metric":item[2],"domain":[item[3],item[4]]};
				//console.log(JSON.stringify(item));
				//console.log(JSON.stringify(size_dimension));
				if (size_dimension.metric === 'same') {
					console.log('same [30,30]');
					radiusScale = d3.scale.sqrt().domain([0,10]).range([0, 10]);
				} else {
					radiusScale = d3.scale.sqrt().domain(size_dimension.domain).range([0, 33]);
				}
				d3.selectAll(".dot")
					.call(position)
					.sort(order);
			});

		// select dimension of data to use as color
		var f1 = create_flyout_selector(
			d3.select("#color_flyout"), // html element into which this widget is placed
			'Circle Color', 			// widget label
			'Unique Colors', 			// default selection
			color_items, 			// data
			function (item) {		// callback with item selected as arg
				var el0 = color_legend[0], el1 = color_legend[1], spectrum = color_legend[2];
				change_ticks([el0,el1],[item[0],item[1]],[item[2],item[3]]);
				if (item[2] === 0) {
					spectrum.style("visibility","hidden");
				} else {
					spectrum.style("visibility","visible");
				}
				//console.log(JSON.stringify(item));
				//console.log(JSON.stringify({"metric":item[2],"domain":[item[3],item[4]]}));
				//colorScale = d3.scale.category20();
				d3.selectAll(".dot")
					.call(position)
					//.style("fill", function(d) { return colorScale(color(d)); })
					//.style("stroke", function(d) { return colorScale(color(d)); })
					.sort(order);
			});


		var f3 = create_flyout_selector(
			d3.select("#y_flyout"), 	// html element into which this widget is placed
			'Y Axis', 				// widget label
			'Achievement Gap %', 	// default selection
			xy_items, 				// data
			function (item) {		// callback with item selected as arg
				//console.log(JSON.stringify(item));
				y_dimension = {"metric":item[2],"domain":[item[3],item[4]]};
				//console.log(JSON.stringify(y_dimension));
				yScale = d3.scale.linear().domain(y_dimension.domain).range([height, 0]);
				yyLabel.text(item[5]);
				yAxis = d3.svg.axis().orient("left").scale(yScale)
					.tickFormat(function(d,ii) {
						if (ii === 0) {
							console.log('y origin' + ' ' + parseInt(d,10) + '%')
							return parseInt(d,10) + "%"
						}
						return parseInt(d, 10) + "%";
					}).tickSize(-width);
				yyAxis.call(yAxis);
				d3.selectAll(".dot")
					.call(position)
					.sort(order);
			});

		var f4 = create_flyout_selector(
			d3.select("#x_flyout"), 	// html element into which this widget is placed
			'X Axis', 				// widget label
			'6-yr Graduation Rate %', 	// default selection
			xy_items, 				// data
			function (item) {		// callback with item selected as arg
				//console.log(JSON.stringify(item));
				x_dimension = {"metric":item[2],"domain":[item[3],item[4]]};
				//console.log(JSON.stringify(x_dimension));
				xScale = d3.scale.linear().domain(x_dimension.domain).range([0, width]);
				xxLabel.text(item[5]);
				xAxis = d3.svg.axis().orient("bottom").scale(xScale)
					.ticks(12)
					.tickFormat(function(d,ii) {
						if (ii === 0) {
							console.log('x origin' + ' ' + parseInt(d,10) + '%')
							return '. . . ' + parseInt(d,10) + "%"
						}
						return parseInt(d, 10) + "%"; 
					}).tickSize(-height);
				xxAxis.call(xAxis);
				d3.selectAll(".dot")
					.call(position)
					.sort(order);
			});

		//var campus_items = ['Bakersfield','Channel Islands','Chico','Dominguez Hills','East Bay'];
		var create_campus_selector = function (container, items) {
			var selected_campuses = {};
			var widget = container.append("div")
				.attr("class","campus_widget");

			var label = widget.append("p");
			var selall = label.append("a")
				.on("click",function () {
					//console.log('select all stub');
					d3.selectAll('.campus_selection input')
						.property("checked",true);
					
					dot.style("opacity",function (d) {
						var id = "tag" + d.campus.replace(/\s+/g, '');
						selected_campuses[id] = true;
						//console.log(id);
						return 1;
					});
					console.log(JSON.stringify(selected_campuses));
				})
				.text('Select All');
			var desel = label.append("a")
				.on("click",function () {
					//console.log('deselect stub');
					d3.selectAll('.campus_selection input')
						.property("checked",false);
					
					dot.style("opacity",function (d) {
						var id = "tag" + d.campus.replace(/\s+/g, '');
						selected_campuses[id] = false;
						//console.log(id);
						return 0;
					});
					console.log(JSON.stringify(selected_campuses));
				})
				.text('Deselect All');
			var list = widget.append("ul")
					.attr("class","campus_selection");
			items.forEach(function (el,i,a) {
				list.append("li")
					.append("label").html('<span style="background:#' + 
						colorScale(color(el)) +
						'">&nbsp;&nbsp;&nbsp;</span>&nbsp;' + el.campus)
					.append("input").style("float","left")
					.attr("type","checkbox")
					.property("checked",function () {
						return true;
					})
					.on("click",function () {
						var id = "tag" + el.campus.replace(/\s+/g, '');
						var checked = this.checked;
						dot.style("opacity",function (d,i) {
							if ("tag" + d.campus.replace(/\s+/g, '') === id) {
								//console.log('selected: ' + id + ' and it is checked ' + checked);
								selected_campuses[id] = checked;
								return checked ? 1: 0;
							} else {
								//console.log(this.style.opacity);
								return this.style.opacity;
							}
						});
						console.log(JSON.stringify(selected_campuses));
					});
			});
			// start with all selected
			dot.style("opacity",function (d) {
				var id = "tag" + d.campus.replace(/\s+/g, '');
				selected_campuses[id] = true;
				//console.log(id);
				return 1;
			});
			console.log(JSON.stringify(selected_campuses));
		};
		create_campus_selector(
			d3.select("#campus_selector"),
			data
		);

	});//data function




});//ready