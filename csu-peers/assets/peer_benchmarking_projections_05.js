$(document).ready(function () {
	'use strict';
	var defeat_cache = '?v=35'; // stable and cache ok

	/*
	  * Page level support functions and general settings, defaults
	  */

	Highcharts.setOptions({
		alternate_palette_colors: ["#de2d26", "#3182bd", "#fd8d3c", "#31a354", "#756bb1", "#fc9272", "#9ecae1", "#fdd0a2", "#a1d99b", "#bcbddc", "#a50f15", "#08519c", "#a63603", "#006d2c", "#54278f", "#fb6a4a", "#6baed6", "#fdae6b", "#74c476", "#9e9ac8", "#fcbba1", "#c6dbef", "#e6550d", "#c7e9c0", "#dadaeb", "#999"],
		colors: ["#f00", "#0f3", "#00f", "#0df", "#f0f", "#fe0", "#f90", "#b3a", "#f3a", "#60f", "#0af", "#0dc", "#6da", "#6ad", "#a6d", "#ad6", "#da6", "#d6a", "#6a6", "#a6a", "#a66", "#66a", "#aa6", "#6aa", "#06a", "#6a0"]
	});

	// single place for server to establish defaults, year range and map of years to data columns, etc.
	var chart_state = {
		'selected_tab_name': 'chart',
		'campus': 'Bakersfield',
		'grad_year': '6yr',
		'cohort': '2008',
		'years': [],
		'peer_count': 5,
		'trends_since': '0',
		'type': 'GR',
		'max_6yr': '2008',
		'yearmap': {
			'6yr': {'2000': 1, '2001': 2, '2002': 3, '2003': 4, '2004': 5, '2005': 6, '2006': 7, '2007': 8, '2008': 9},
			'4yr': {'2000': 3, '2001': 4, '2002': 5, '2003': 6, '2004': 7, '2005': 8, '2006': 9, '2007': 10, '2008': 11}
		},
		'projected_years': ['2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021'],
		'projected_campuses': 'default',
		'notify': null
	};
	chart_state.notify = function () {
		$('.control').trigger('state_change', [chart_state]);
	};

	var pattern1 = new RegExp('[$%,]', 'g');
	var pattern2 = new RegExp(' ', 'g');

	var retained_json_data;
	var peer_campus_urls; // saves having to reload data

	// one place to consistently convert to shorter csu name
	var convert_csu_campus_name = function (campus_name) {
		var name = campus_name; // so as not to reassign campus_name
		name = name.replace('California State University-','CSU ');
		name = name.replace('California State Polytechnic University-','CSU ');
		name = name.replace('California Polytechnic State University-','CSU ');
		return name;
	};

	var convert_location_to_csu_name = function (location) {
		var csu_locations_ordinary = ['Bakersfield', 'Channel Islands', 'Chico', 'Dominguez Hills', 'East Bay', 'Fresno', 'Fullerton', 'Long Beach', 'Los Angeles', 'Monterey Bay', 'Northridge', 'Pomona', 'Sacramento', 'San Bernardino', 'San Luis Obispo', 'San Marcos', 'Stanislaus'];
		if (csu_locations_ordinary.indexOf(location) !== -1) {
			return 'CSU ' + location;
		} else if (location === 'Maritime Academy') {
			return 'California Maritime Academy';
		} else {
			return location + ' State University';
		}
	};

	var shorten_peer_name = function (campus_name) {
		var name = campus_name; // so as not to reassign campus_name
		name = name.replace(new RegExp('CUNY John Jay College.*$'), 'CUNY John Jay College'); // of Criminal Justice
		name = name.replace(new RegExp('Bowling Green State University.*$'), 'Bowling Green State University');
		name = name.replace(new RegExp('University of South Florida.*$'), 'University of South Florida'); // - Main Campus
		name = name.replace(new RegExp('University of New Mexico.*$'), 'University of New Mexico'); // - Main Campus
		name = name.replace(new RegExp('New Mexico State University.*$'), 'New Mexico State University'); // - Main Campus
		return name;
	};

	var match_csu_campus = function (location, formal_name) { // true or false
		return (formal_name === 'California State University-' + location ||
			formal_name === 'California ' + location ||
			formal_name === 'California State Polytechnic University-' + location ||
			formal_name === 'California Polytechnic State University-' + location ||
			formal_name === location + ' State University');
	};

	/*
	  * Functions specific to 'CSU Peer Comparisons' tab
	  */

	// create the highchart
	var create_chart_peer_comparisons = function (config, data) {
		$('#container').highcharts({
			credits: {
				enabled: false
			},
			chart: {
			    type: 'column'
			},
			title: {
			    text: config.grad_year.slice(0, 1) + '-Year Graduation Rate for First-Time, Full-Time Freshmen'
			},
			subtitle: {
			    text: config.cohort + ' Cohort'
			},
			xAxis: {
			    type: 'category',
			    labels: {
				rotation: -45,
				style: {
				    fontSize: '13px',
				    fontFamily: 'Verdana, sans-serif'
				}
			    }
			},
			yAxis: {
			    title: {
			       text:  '% Graduated'
			    }
			},
			legend: {
			    enabled: false
			},
			tooltip: {
			    pointFormat: 'Rate:{point.y:.0f}%'
			},
			series: [{
			    data: data
			}]
		});
	};

	var update_chart_peer_comparisons = function (config, json_data) {
		var series = [];
		var col = config.yearmap[config.grad_year][config.cohort];

		json_data.rows.forEach(function (row, i) {
			var key = row[0];
			var value = parseFloat(row[col]);

			if (match_csu_campus(config.campus, key)) {
				key = convert_csu_campus_name(key);
				series[i] = {'name':key, 'y':value, 'color':'#635'};
			} else {
				key = convert_csu_campus_name(key);
				key = shorten_peer_name(key);
				series[i] = {'name':key, 'y':value, 'color':'#159'};
			}
		});

		// descending sort by y-axis value
		series = series.sort(function (b, a) {
			return a.y - b.y;
		}); 

		var s0 = series[0];
		var s1 = series[1];
		if (isNaN(s0.y)) {
			series[0] = s1;
			series[1] = s0;
		}

		// redisplay the chart
		create_chart_peer_comparisons(config, series);
	};

	/*
	  * Functions specific to 'Projected Trends' tab
	  */

	var create_chart_projections = function (config, data) {
		$('#projections_chart_container').highcharts({
			credits: {
				enabled: false
			},
			chart: {
				height: 500,
				type: 'line'
			},
			title: {
				text: 'Graduation Rate Projections for First-Time, Full-Time Freshmen',
				x: -20 //center
			},
			xAxis: {
				categories: config.years.concat(config.projected_years.slice(0, 17 - config.grad_year[0]))
			},
			yAxis: {
				title: {
					text: '% Grad Rate'
				},
				plotLines: [{
					value: 0,
					width: 1,
					color: '#777'
				}]
			},
			tooltip: {
				valueSuffix: '%'
			},
			legend: {
				title: {style: {'color': '#777'}, text: '(Click to show/hide campuses)'},
				layout: 'horizontal',
				align: 'center',
				width: 900,
				itemWidth: 300,
				borderWidth: 0
			},
			series: data
		});
	};

	/*
	  * Functions specific to 'Historical Trends' tab
	  */

	var create_chart_historical_trends = function (config, data) {
		$('#trends_chart_container').highcharts({
			credits: {
				enabled: false
			},
			chart: {
				type: 'line'
			},
			title: {
				text: 'Graduation Rate Trends for First-Time, Full-Time Freshmen',
				x: -20 //center
			},
			xAxis: {
				categories: config.years
			},
			yAxis: {
				title: {
					text: '% Grad Rate'
				},
				plotLines: [{
					value: 0,
					width: 1,
					color: '#777'
				}]
			},
			tooltip: {
				valueSuffix: '%'
			},
			legend: {
				title: {style: {'color': '#777'}, text: '(Click to show/hide campuses)'},
				layout: 'horizontal',
				align: 'center',
				width: 200,
				borderWidth: 0
			},
			series: data
		});
	};

	// fetch appropriate data set, subsequent fetches of same campus/grad_year will be from cache
	// change of number of years to show does not require fetch
	// nor does a change of cohort year, as this file also provides data for peer comparisons graph
	var load_chart_historical_trends = function (config, callback) {
		// build (relative) source url from parts in config, e.g. 'data/GR6yr/San_Luis_Obispo_6yrGR.json'
		var chart_data_src = 'data/' + config.type + config.grad_year + '/' +
			config.campus.replace(pattern2, '_') + '_' + config.grad_year + config.type + '.json' + defeat_cache;

		$.ajax({
			url: chart_data_src,
			datatype: "json",
			success: function (result) {
				var json_object = (typeof result === 'string') ? JSON.parse(result) : result;
				callback(json_object, config);
			}
		});
	};

	// only show year_span of series (series array is sliced at position)
	var truncate_data = function (data, position) {
		var out = [];
		var itemset;
		data.forEach(function (item) { // assumes only name, data, lineWidth properties
			if (item && item.hasOwnProperty('name')) {
				itemset = {'name':item.name};
				itemset.data = item.data.slice(position);
				itemset.lineWidth = item.lineWidth;
				itemset.zIndex = item.zIndex;
				itemset.visible = item.visible;
				itemset.connectNulls = item.connectEnds;
				if (item.hasOwnProperty('zones')) {
					itemset.zoneAxis = item.zoneAxis;
					itemset.zones = item.zones;
				}
				out.push(itemset);
			}
		});
		return out;
	};

	// select appropriate subset of peers
	var extract_peers = function (config, json_data) {
		var out_data = [];
		var selected_campus_data;
		var parse_item = function (item, j, a) {
			a[j] = parseFloat(item);
			a[j] = isNaN(a[j]) ? null : a[j];
		};
		json_data.rows.forEach(function (row) {
			var name = shorten_peer_name(row[0]);
			var series = row.slice(1);
			series.forEach(parse_item);
			if (config.grad_year === '4yr') { // hack to fix bad 4yr data
				series = series.slice(2); // skipping first two years (which are really 1998, 1999: not 2000, 2001)
			}
			if (match_csu_campus(config.campus, name)) {
				selected_campus_data = {'name':convert_csu_campus_name(name), 'data':series, 'lineWidth': 4, 'selected': true, 'connectEnds': true};
			} else {
				out_data.push({'name':convert_csu_campus_name(name), 'data':series, 'lineWidth': 2, 'selected': false, 'connectEnds': true});
			}
		});
		out_data.sort(function (b, a) { // sort by final year's grad_rate descending
			return a.data.slice(-1) - b.data.slice(-1);
		});
		out_data.unshift(selected_campus_data); // but place selected campus in first position
		out_data.forEach(function (campus_data, i, a) {
			campus_data.zIndex = a.length - i;
		});
		return out_data;
	};

	var filter_out_peer_series = function (config, series_data) {
		var out_data_subset = series_data.slice(1, config.peer_count);
		out_data_subset.sort(function (a, b) { // sort by name the few chosen
			return a.name > b.name ? 1 : (a.name === b.name) ? 0 : -1;
		});
		out_data_subset.unshift(series_data[0]); // but place selected campus in first position
		return out_data_subset;
	};

	var filter_off_peer_series = function (config, series_data) {
		var out_data_subset = series_data.slice(1).map(function (item, i) {
			if (config.projected_campuses === 'default') {
				item.visible = (i < 4);
			} else {
				item.visible = true;
			}
			return item;
		});
		out_data_subset.sort(function (a, b) { // sort by name the few chosen
			return a.name > b.name ? 1 : (a.name === b.name) ? 0 : -1;
		});
		out_data_subset.unshift(series_data[0]); // but place selected campus in first position
		return out_data_subset;
	};

	var fake_extend_series = function (config, series_data) {
		series_data.forEach(function (series) {
			config.projected_years.slice(0, 17 - config.grad_year[0]).forEach(function () {
				series.data.push(null);
			});
			series.data[series.data.length - 1] = config.grad_year === '6yr' ? 65.0 : 40.0;
			series.zoneAxis = 'x';
			series.zones = [{value: 9}, {dashStyle: 'dot'}];
		});
		return series_data;
	};

	var create_table_historical_trends = function (config, peer_subset) {
		var year_start = config.years[0];
		var year_end = config.years.slice(-1)[0];
		var n = config.grad_year[0];
		var trend_table_row_template = '<tr><td>{name}</td><td class="nowrap">{avg}</td></tr>';
		var heading = year_start + '-' + year_end + ' Average Annual Improvement in ' + n + '-Year Grad Rates';
		var detail = '<table class="table table-striped"><tbody>';
		peer_subset.forEach(function (item) {
			var line;
			var avg;
			if (!item.data || item.data.slice(-1)[0] === null || item.data[0] === null || item.data.length <= 1) {
				line = trend_table_row_template.replace('{name}', item.name).replace('{avg}', 'n/a');
			} else {
				if (item.data && item.data.length > 1) { // (len - 1) !== 0,  avoid divide by zero
					avg = '' + Math.round(10.0 * (item.data.slice(-1)[0] - item.data[0]) / (item.data.length - 1)) / 10.0;
				}
				if (avg.split('.').length === 1) { // formatting
					avg += '.0';
				}
				line = trend_table_row_template.replace('{name}', item.name).replace('{avg}', avg + ' % points');
			}
			detail += line;
		});
		detail += '</tbody></table>';
		$('#text_panel_0').html('<h3>' + heading + '</h3>' + detail);
	};

	var update_chart_projected_trends = function (config, json_data) { // config is modified
		var map_years = {'5':-5, '3':-3, '0':0}; // modify to match returned values from control
		var yearkeys = Object.keys(config.yearmap[config.grad_year]);
		config.years = yearkeys.slice(map_years[config.trends_since]); // config.years used only with historical trends
		create_chart_projections(config, truncate_data(fake_extend_series(config, filter_off_peer_series(config, extract_peers(config, json_data)), map_years[config.trends_since])));
		if (config.grad_year === '6yr') {
			$('#projections_shade').addClass('gr6yr');
		} else {
			$('#projections_shade').removeClass('gr6yr');
		}

		// Footnote also changes with change in grad_year, cohort, and campus name
		$('#projections_footnote').html('*Showing ' + convert_location_to_csu_name(config.campus) +
			' and its four top performing national peers (based on their ' +
			config.years.slice(-1)[0] + ' cohort ' + config.grad_year[0] + '-Year graduation rates).');

		$('#download_projections_csv').off('click', function () {
			console.log(download_series_as_csv(config, json_data));
		});
		$('#download_projections_csv').on('click', function () {
			download_series_as_csv(config, json_data);
		});
	};

	var update_chart_historical_trends = function (config, json_data) { // config is modified
		var map_years = {'5':-5, '3':-3, '0':0}; // modify to match returned values from control
		var yearkeys = Object.keys(config.yearmap[config.grad_year]);
		config.years = yearkeys.slice(map_years[config.trends_since]); // config.years used only with historical trends

		var truncated_peer_subset = truncate_data(filter_out_peer_series(config, extract_peers(config, json_data)), map_years[config.trends_since]);
		create_chart_historical_trends(config, truncated_peer_subset);
		create_table_historical_trends(config, truncated_peer_subset);

		// Footnote also changes with change in grad_year, cohort, and campus name
		$('#trends_footnote').html('*Showing ' + convert_location_to_csu_name(config.campus) +
			' and its four top performing national peers (based on their ' +
			config.years.slice(-1)[0] + ' cohort ' + config.grad_year[0] + '-Year graduation rates).');
	};

	/*
	  * Functions related to 'Data Tables' tab
	  */

	var activate_table_sort = function (tbody, header) { // tbody is modified
		var sortcol = function (tbody, col, direction) {
			var i;
			var ilen = tbody.children.length;
			var trs = [];
			var tr;
			var td;
			for (i = 0; i < ilen; i +=1) {
				tr = tbody.children[i];
				td = tr.children[col].innerText;
				trs[i] = [td,i,tr.innerHTML,tr.className || ''];
			}
			var frag = document.createDocumentFragment();
			if (direction === 'ascending') {
				trs.sort(function (a, b) {
					var aa = a[0].toUpperCase();
					var bb = b[0].toUpperCase();
					aa = aa.indexOf('ds*') !== -1 ? '$0' : aa;
					bb = bb.indexOf('ds*') !== -1 ? '$0' : bb;
					aa = aa.replace(pattern1, '');
					bb = bb.replace(pattern1, '');
					aa = isNaN(parseFloat(aa)) ? aa : parseFloat(aa);
					bb = isNaN(parseFloat(bb)) ? bb : parseFloat(bb);
					return aa > bb ? 1 : (aa === bb) ? 0 : -1;
				});
			} else {
				trs.sort(function (b, a) {
					var aa = a[0].toUpperCase();
					var bb = b[0].toUpperCase();
					aa = aa.indexOf('ds*') !== -1 ? '$0' : aa;
					bb = bb.indexOf('ds*') !== -1 ? '$0' : bb;
					aa = aa.replace(pattern1, '');
					bb = bb.replace(pattern1, '');
					aa = isNaN(parseFloat(aa)) ? aa : parseFloat(aa);
					bb = isNaN(parseFloat(bb)) ? bb : parseFloat(bb);
					return aa > bb ? 1 : (aa === bb) ? 0 : -1;
				});
			}
			trs.forEach(function (tr) {
				var row = document.createElement('tr');
				if (tr[3].indexOf('highlight') !== -1) { // reapply className to tr element represented by frag
					row.className = "highlight";
				}
				row.innerHTML = tr[2];
				frag.appendChild(row);
			});
			tbody.innerHTML = '';
			tbody.appendChild(frag, tbody);
		};

		var sort_toggle_state = {}; // for toggling sort direction
		var cols = [];
		header.forEach(function (item, i) { // not interested in the header text, only its position
			var ord = 'ord' + i;
			cols.push('#col_' + i);
			$(cols[i]).on('click', function () {
				if (!sort_toggle_state[ord] || sort_toggle_state[ord] !== 'ascending') { // toggle
					sort_toggle_state[ord] = 'ascending';
				} else {
					sort_toggle_state[ord] = 'descending';
				}
				sortcol(tbody, i, sort_toggle_state[ord]);
			});
			if (item === 'never @*%&!ng used') { // idiocy for the sake of the linter obsessed
				return;
			}
		});
	};

	var relabel_table_peers = function (header_item) {
		var item = header_item; // so as not to reassign header_item
		item = (item === 'Main') ? 'Campus': item;
		item = (item === 'Underrepresented Minority 6-Year Grad Rate') ? 'URM&nbsp;6-Year Grad&nbsp;Rate': item;
		item = (item === '% Pell Recipients Among Freshmen') ? '%&nbsp;Pell Eligible': item;
		item = (item === '% Underrepresented Minority') ? '%&nbsp;URM': item;
		item = (item === 'Average High School GPA Among College Freshmen') ? 'Average&nbsp;High School&nbsp;GPA': item;
		item = (item === 'Estimated Median SAT / ACT') ? 'Average SAT&nbsp;Score': item;
		item = (item === 'Size (Undergrad FTE)') ? '(Undergrad FTE)&nbsp;Size': item;
		item = item.replace('Grad Rate','Grad&nbsp;Rate');
		return item;
	};

	var create_table_peers = function (json, config) {
		var thead_html = '<thead><tr>';
		var one_or_two;
		var header_copy = json.headers[0];
		if (config.grad_year === '4yr') { // remove 2nd and possibly 3rd column, insert last column
			one_or_two = (header_copy[2] === 'Underrepresented Minority 6-Year Grad Rate') ? 2 : 1;
			header_copy.splice(1,one_or_two,header_copy.splice(-1, 1)[0]); // remove 6yr column(s) and move last column to 2nd column position
			header_copy[1] = config.cohort + '&nbsp;4yr Grad&nbsp;Rate';
		} else { // 6yr
			header_copy.splice(-1,1); // simply remove last col
		}
		header_copy.forEach(function (item, i) {
			item = relabel_table_peers(item);
			if (i === 0) {
				thead_html += '<th id="col_' + i + '" class="col_campus">' + item + '</th>';
			} else {
				thead_html += '<th id="col_' + i + '">' + item + '</th>';
			}
		});
		thead_html += '</tr></thead>';
		var tbody_html = '<tbody id="tb1">';
		json.rows.forEach(function (row) {
			var row_copy = row.slice();
			if (config.grad_year === '4yr') { // remove 2nd and possibly 3rd column, insert last column
				row_copy.splice(1, one_or_two, row_copy.splice(-1, 1)[0]); // remove 6yr column(s) and move last column to 2nd column position
			} else { // 6yr
				row_copy.splice(-1, 1); // simply remove last col
			}
			row_copy.forEach(function (item, i) {
				var name;
				var link;
				var campus_column_template = '<td class="col_campus"><a href="{link}" target="_blank">{name}</a></td>';
				if (item === '-') {
					item = 'ds*'; // per spec, replace dash in source with 'ds*' indicating data suppressed
				}
				// Exception handling for campus name matching (enables highlighting of selected campus)
				if (i === 0) { // campus name column
					name = item;
					link = '#';
					if (peer_campus_urls.hasOwnProperty(name)) {
						link = peer_campus_urls[name];
					}
					if (match_csu_campus(config.campus, name)) {
						tbody_html += '<tr class="highlight">'; // row to highlight matches csu campus selected
					} else {
						tbody_html += '<tr>';
					}
					name = shorten_peer_name(name);
					tbody_html += campus_column_template.replace('{link}', link).replace('{name}', convert_csu_campus_name(name));
				} else {
					tbody_html += '<td>' + item + '</td>';
				}
			});
			tbody_html += '</tr>';
		});
		tbody_html += '</tbody>';
		$('#desctable').html(thead_html + tbody_html); // write table to DOM

		activate_table_sort($('#tb1')[0], json.headers[0]); // make its columns sortable
	};

	var load_table_peers = function (config, callback) {
		var table_data_src = 'data/GRtables/' + config.campus.replace(pattern2, '_') + '_' + config.cohort + '_briefplus.json' + defeat_cache;
		$.ajax({
			url: table_data_src,
			datatype: "json",
			success: function (result) {
				var json_object = (typeof result === 'string') ? JSON.parse(result) : result;
				callback(json_object, config);
			}
		});
	};

	var load_peer_campus_urls = function (config, callback) {
		var chart_data_src = 'data/peer_campus_urls.json' + defeat_cache;

		$.ajax({
			url: chart_data_src,
			datatype: "json",
			success: function (result) {
				var json_object = (typeof result === 'string') ? JSON.parse(result) : result;
				callback(json_object, config);
			}
		});
	};

	var download_series_as_csv = function (config, json_data, transform_function) {
		var output = '';
		if (transform_function && typeof transform_function === 'function') {
			output = transform_function(json_data);
		} else {
			json_data.headers[0].forEach(function (cell) {
					if (cell.length && cell[0] === '"') {
						output += cell;
					} else {
						output += '"' + cell + '"';
					}
			});
			output += '\n';
			json_data.rows.forEach(function (row) {
				var line = [];
				row.forEach(function (cell) {
					if (cell.length && cell[0] === '"') {
						line.push(cell);
					} else {
						line.push('"' + cell + '"');
					}
				});
				output += line.join(',') + '\n';
			});
		}
		// download magic here, instead of returning output, create document that downloads
		var linkDownload = function (a, filename, content) {
			var contentType =  'data:application/octet-stream,';
			var uriContent = contentType + encodeURIComponent(content);
			a.setAttribute('href', uriContent);
			a.setAttribute('download', filename);
		};
		var download = function (filename, content) {
			var a = document.createElement('a');
			linkDownload(a, filename, content);
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		};
		download('Projected_Trends_' + config.grad_year + '_for_' + config.campus + '.csv', output);
		//return output;
	};
	// initialize
	(function () {
		/*
		  * Connect user input controls to activation functions
		  */

		$('#campus_selector').on('change', function (e) { // Bakersfield, ..., Stanislaus
			chart_state.campus = e.target.value;
			chart_state.notify();
			load_chart_historical_trends(chart_state,  function (json_data, chart_state) {
				retained_json_data = json_data;
				update_chart_historical_trends(chart_state, retained_json_data);
				update_chart_projected_trends(chart_state, retained_json_data);
				update_chart_peer_comparisons(chart_state, retained_json_data);
			});
			load_table_peers(chart_state, create_table_peers);
		});

		$('#cohort_selector_6yr').on('change', function (e) { // 2000, ..., 2008
			chart_state.cohort = e.target.value;
			chart_state.notify();
			update_chart_peer_comparisons(chart_state, retained_json_data);
			load_table_peers(chart_state, create_table_peers);
		});

		$('#cohort_selector_4yr').on('change', function (e) { // 2000, ..., 2008
			chart_state.cohort = e.target.value;
			chart_state.notify();
			update_chart_peer_comparisons(chart_state, retained_json_data);
			load_table_peers(chart_state, create_table_peers);
		});

		$('#year_selector').on('change', function (e) { // 6yr or 4yr
			chart_state.grad_year = e.target.value;
			chart_state.notify();
			load_chart_historical_trends(chart_state,  function (json_data, chart_state) {
				retained_json_data = json_data;
				update_chart_peer_comparisons(chart_state, retained_json_data);
				update_chart_historical_trends(chart_state, retained_json_data);
				update_chart_projected_trends(chart_state, retained_json_data);
			});
			load_table_peers(chart_state, create_table_peers); // Note: eliminate unnecessary data fetch
		});

		$('#year_span_selector').on('change', function (e) { // Past Three Years, Past Five Years, Since 2000
			chart_state.trends_since = e.target.value;
			update_chart_historical_trends(chart_state, retained_json_data);
		});

		/*
		  * Initialize charts and tables with default settings, load initial data
		  */

		load_peer_campus_urls(chart_state, function (json_data, chart_state) {
			peer_campus_urls = json_data;
			// only table_peers needs the urls and the list needs loading only once
			// but should be loaded before creating table
			load_table_peers(chart_state, create_table_peers);
		});

		load_chart_historical_trends(chart_state, function (json_data, chart_state) {
			retained_json_data = json_data;
			update_chart_peer_comparisons(chart_state, retained_json_data);
			update_chart_historical_trends(chart_state, retained_json_data);
			update_chart_projected_trends(chart_state, retained_json_data);
			$('#projections_all').on('click', function () {
				if (chart_state.projected_campuses !== 'all') { // only if changed
					chart_state.projected_campuses = 'all';
					update_chart_projected_trends(chart_state, retained_json_data);
				}
			});
			$('#projections_reset').on('click', function () {
				chart_state.projected_campuses = 'default';
				update_chart_projected_trends(chart_state, retained_json_data);
			});
		});

		/*
		  * Custom event listeners respond to any change of tab, campus, cohort, etc.
		  */

		$('#label_year_selector').on('state_change', function () {
			var pertinent_tabs = ['chart', 'trends', 'table', 'projections'];
			if (pertinent_tabs.indexOf(chart_state.selected_tab_name) !== -1) {
				$('#label_year_selector').show();
			} else {
				$('#label_year_selector').hide();
			}
		});
		$('#label_campus_selector').on('state_change', function () {
			var pertinent_tabs = ['chart', 'trends', 'table', 'projections'];
			if (pertinent_tabs.indexOf(chart_state.selected_tab_name) !== -1) {
				$('#label_campus_selector').show();
			} else {
				$('#label_campus_selector').hide();
			}
		});
		$('#label_cohort_selector').on('state_change', function () {
			var pertinent_tabs = ['chart', 'table'];
			if (pertinent_tabs.indexOf(chart_state.selected_tab_name) !== -1) {
				$('#label_cohort_selector').show();
			} else {
				$('#label_cohort_selector').hide();
			}
		});
		$('#label_year_span_selector').on('state_change', function () {
			var pertinent_tabs = ['trends'];
			if (pertinent_tabs.indexOf(chart_state.selected_tab_name) !== -1) {
				$('#label_year_span_selector').show();
			} else {
				$('#label_year_span_selector').hide();
			}
		});

		$('#cohort_selector_6yr').on('state_change', function () {
			if (chart_state.grad_year !== '6yr') {
				$('#cohort_selector_6yr').hide();
			} else {
				if (chart_state.cohort > chart_state.max_6yr) {
					$('#cohort_selector_6yr').val(chart_state.max_6yr);
					chart_state.cohort = chart_state.max_6yr;
				} else {
					$('#cohort_selector_6yr').val(chart_state.cohort); // sync with changes to 4yr
				}
				$('#cohort_selector_6yr').show();
			}
		});

		$('#cohort_selector_4yr').on('state_change', function () {
			if (chart_state.grad_year !== '4yr') {
				$('#cohort_selector_4yr').hide();
			} else {
				$('#cohort_selector_4yr').val(chart_state.cohort); // sync with changes to 6yr
				$('#cohort_selector_4yr').show();
			}
		});

		/*
		  * Activate tab navigation
		  */

		chart_state.notify(); // default tab and controls selected on page load

		$(".nav-tabs a").on('click', function (e) { // what to do when a tab is selected
			$(e.target).tab('show');
			chart_state.selected_tab_name = e.target.href.split('#')[1]; // i.e., one of ['chart','table','method','trends','projections']
			chart_state.notify();
		});
	}()); // initialized
});
