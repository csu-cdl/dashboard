$(document).ready(function () {
	'use strict';
	var defeat_cache = '?v=33';

	/* 
	  * Page level support functions and general settings, defaults
	  */

	Highcharts.setOptions({
		colors: ['#ED361B', '#058DC7', '#50B432', '#DDDF00', '#24CBE5', '#64E572', '#FF9655', '#FFF263', '#6AF9C4']
	});

	var chart_state;
	chart_state = {
		'selected_tab_name':'chart', 'campus':'Bakersfield', 
		'grad_year':'6yr', 'cohort':'2008', 'years':[], 'peer_count':5,
		'trends_since':'0', 'type':'GR', 'max_6yr':'2008', 
		'notify':function () {
			$('.control').trigger('state_change', [chart_state]);
		}
	};
	
	var pattern1 = new RegExp('[$%,]', 'g');
	var pattern2 = new RegExp(' ', 'g');

	var years = {'4yr':['2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008'],
			'6yr':['2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008']};
	var map_years = {'5':-5, '3':-3, '0':0}; // modify to match returned values from control 
	var retained_json_data;
	var peer_campus_urls; // saves having to reload data

	// one place to consistently convert to shorter csu name
	var convert_csu_campus_name = function (name) {
		name = name.replace('California State University-','CSU ');
		name = name.replace('California State Polytechnic University-','CSU ');
		name = name.replace('California Polytechnic State University-','CSU ');
		return name;
	};

	var shorten_peer_name = function (name) {
		name = name.replace(new RegExp('CUNY John Jay College.*$'),'CUNY John Jay College'); // of Criminal Justice
		name = name.replace(new RegExp('Bowling Green State University.*$'),'Bowling Green State University');
		name = name.replace(new RegExp('University of South Florida.*$'),'University of South Florida'); // - Main Campus
		name = name.replace(new RegExp('University of New Mexico.*$'),'University of New Mexico'); // - Main Campus
		name = name.replace(new RegExp('New Mexico State University.*$'),'New Mexico State University'); // - Main Campus 
		return name;
	};
	// test: console.log(shorten_peer_name('CUNY John Jay College of Criminal Justice'));

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
			chart: {
			    type: 'column'
			},
			title: {
			    text: config.grad_year.slice(0,1) + '-Year Graduation Rate for First-Time, Full-Time Freshmen'
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
		var cohort2col_6yr = {'2000':1, '2001':2, '2002':3, '2003':4, '2004':5, '2005':6, '2006':7, '2007':8, '2008':9};
		var cohort2col_4yr = {'2000':3, '2001':4, '2002':5, '2003':6, '2004':7, '2005':8, '2006':9, '2007':10, '2008':11};
		var col;
		var key;
		var value;
		var series = [];
		if (config.grad_year === '6yr') {
			col = cohort2col_6yr[config.cohort];
		} else {
			col = cohort2col_4yr[config.cohort];
		}

		json_data.rows.forEach(function (row, i) {
			key = row[0];
			value = parseFloat(row[col]);

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
		series = series.sort(function (b,a) {
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
	  * Functions specific to 'Historical Trends' tab
	  */

	var create_chart_historical_trends = function (config, data) {
		$('#multiline_chart_container').highcharts({
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
		$('#trends_footnote').html('*Showing ' + data[0].name + 
			' and its four top performing national peers (based on their ' + 
			config.years.slice(-1)[0] + ' cohort ' + config.grad_year[0] + '-Year graduation rates).');
	};

	// fetch appropriate data set
	var load_chart_historical_trends = function (config, callback) {
		// build (relative) source url from parts in config, e.g. 'data/GR6yr/San_Luis_Obispo_6yrGR.json'
		var chart_data_src = 'data/' + config.type + config.grad_year + '/' + 
			config.campus.replace(pattern2,'_') + '_' + config.grad_year + config.type + '.json' + defeat_cache;

		$.ajax({
			url: chart_data_src,
			datatype: "json",
			success: function (result) {
				var json_object = (typeof result === 'string') ? JSON.parse(result) : result;
				callback(json_object, config);
			}/*,
			error: function (xhr, msg, e) {
				console.log(msg);
			}*/
		});
	};

	// only show year_span of series (series array is sliced at position)
	var truncate_data = function (data, position) {
		var out = [];
		var itemset;
		data.forEach(function (item) { // assumes only name, data, lineWidth properties
			if (item && item.hasOwnProperty('name') && item.hasOwnProperty('data')) {
				itemset = {'name':item.name};
				if (item.hasOwnProperty('lineWidth')) {
					itemset.lineWidth = item.lineWidth;
				}
				itemset.data = item.data.slice(map_years[position]);
				out.push(itemset);
			}
		});
		return out;
	};

	// select appropriate subset of peers
	var filter_peers = function (config, json_data) {
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
				selected_campus_data = {'name':convert_csu_campus_name(name), 'data':series, 'lineWidth': 4};
			} else {
				out_data.push({'name':convert_csu_campus_name(name), 'data':series});
			}
		});
		out_data.sort(function (a,b) {
			return a.data.slice(-1) - b.data.slice(-1);
		});
		var out_data_subset = out_data.slice(1 - config.peer_count);
		out_data_subset.sort(function (a,b) {
			return a.name > b.name ? 1 : (a.name === b.name) ? 0 : -1;
		});
		out_data_subset.unshift(selected_campus_data);
		return out_data_subset;
	};

	var create_table_historical_trends = function (config, peer_subset) {
		var line;
		var avg;
		var year_start = config.years[0];
		var year_end = config.years.slice(-1)[0];
		var n = config.grad_year[0];
		var trend_table_row_template = '<tr><td>{name}</td><td class="nowrap"' +
			' style="min-width:3em;text-align:right;"' +  // Note: style to css
			'>{avg}</td></tr>';
		var heading = year_start + '-' + year_end + ' Average Annual Improvement in ' + n + '-Year Grad Rates';
		var detail = '<table class="table table-striped"><tbody>';
		peer_subset.forEach(function (item) {
			if (!item.data || item.data.slice(-1)[0] === null || item.data[0] === null || item.data.length <= 1) {
				line = trend_table_row_template.replace('{name}', item.name).replace('{avg}', 'n/a');
			} else {
				if (item.data && item.data.length > 1) { // (len - 1) !== 0,  avoid divide by zero
					avg = '' + Math.round(10.0 * (item.data.slice(-1)[0] - item.data[0]) / (item.data.length - 1))/10.0;
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

	var update_chart_historical_trends = function (config, json_data) {
		var truncated_peer_subset = truncate_data(filter_peers(config, json_data), config.years.length);
		create_chart_historical_trends(config, truncated_peer_subset);
		create_table_historical_trends(config, truncated_peer_subset);
	};

	/* 
	  * Functions related to 'Data Tables' tab
	  */

	var activate_table_sort = function (tbody, header) {
		var sortcol = function (tbody, col, direction) {
			var i;
			var ilen = tbody.children.length;
			var trs = [];
			var tr;
			var td;
			for (i = 0; i < ilen; i+=1) {
				tr = tbody.children[i];
				td = tr.children[col].innerText;
				trs[i] = [td,i,tr.innerHTML,tr.className || ''];
			}
			var frag = document.createDocumentFragment();
			if (direction === 'ascending') {
				trs.sort(function (a,b) {
					var aa = a[0].toUpperCase();
					var bb = b[0].toUpperCase();
					aa = aa.indexOf('ds*') !== -1 ? '$0' : aa;
					bb = bb.indexOf('ds*') !== -1 ? '$0' : bb;
					aa = aa.replace(pattern1,'');
					bb = bb.replace(pattern1,'');
					aa = isNaN(parseFloat(aa)) ? aa : parseFloat(aa);
					bb = isNaN(parseFloat(bb)) ? bb : parseFloat(bb);
					return aa > bb ? 1 : (aa === bb) ? 0 : -1;
				});
			} else {
				trs.sort(function (b,a) {
					var aa = a[0].toUpperCase();
					var bb = b[0].toUpperCase();
					aa = aa.indexOf('ds*') !== -1 ? '$0' : aa;
					bb = bb.indexOf('ds*') !== -1 ? '$0' : bb;
					aa = aa.replace(pattern1,'');
					bb = bb.replace(pattern1,'');
					aa = isNaN(parseFloat(aa)) ? aa : parseFloat(aa);
					bb = isNaN(parseFloat(bb)) ? bb : parseFloat(bb);
					return aa > bb ? 1 : (aa === bb) ? 0 : -1;
				});
			}
			trs.forEach(function (tr) {
				var row = document.createElement('tr');
				if (tr[3].indexOf('highlight') !== -1) {
					row.className = "highlight";
				}
				row.innerHTML = tr[2];
				frag.appendChild(row);
			});
			tbody.innerHTML = '';
			tbody.appendChild(frag,tbody);
		};

		var sort_toggle_state = {}; // for toggling sort direction
		var cols = [];
		header.forEach(function (item,i) {
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
		});
	};

	var relabel_table_peers = function (item) {
		item = (item === 'Main') ? 'Campus': item;
		item = (item === 'Underrepresented Minority 6-Year Grad Rate') ? 'URM 6-Year Grad Rate': item;
		item = (item === '% Pell Recipients Among Freshmen') ? '% Pell Eligible': item;
		item = (item === '% Underrepresented Minority') ? '% URM': item;
		item = (item === 'Average High School GPA Among College Freshmen') ? 'Average High School GPA': item;
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
			header_copy.splice(1,one_or_two,header_copy.splice(-1,1)[0]); // remove 6yr column(s) and move last column to 2nd column position
			header_copy[1] = config.cohort + '&nbsp;4yr Grad&nbsp;Rate';
		} else { // 6yr
			header_copy.splice(-1,1); // simply remove last col
		}
		header_copy.forEach(function (item,i) {
			item = relabel_table_peers(item);
			if (i === 0) {
				thead_html += '<th id="col_' + i + '" class="col_campus">' + item + '</th>'; 
			} else {
				thead_html += '<th id="col_' + i + '"  style="text-align:right;padding-right:5px;">' + item + '</th>';  // Note: move style to css
			}
		});
		thead_html += '</tr></thead>';
		var tbody_html = '<tbody id="tb1">';
		json.rows.forEach(function (row) {
			var row_copy = row.slice();
			if (config.grad_year === '4yr') { // remove 2nd and possibly 3rd column, insert last column
				row_copy.splice(1,one_or_two,row_copy.splice(-1,1)[0]); // remove 6yr column(s) and move last column to 2nd column position
			} else { // 6yr
				row_copy.splice(-1,1); // simply remove last col
			}
			row_copy.forEach(function (item,i) {
				var name;
				var link;
				var color;
				var campus_column_template = '<td class="col_campus">' + 
					'<a href="{link}" target="_blank"' + 
					' style="color:{color};text-decoration:underline;"' + // Note: move style to css
					'>{name}</a></td>';
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
						color = '#b00';
						tbody_html += '<tr class="highlight">'; // row to highlight matches csu campus selected
					} else {
						color = '#111';
						tbody_html += '<tr>';
					}
					name = shorten_peer_name(name);
					tbody_html += campus_column_template.replace('{link}', link).replace('{name}', convert_csu_campus_name(name)).replace('{color}', color);
				} else {
					tbody_html += '<td style="text-align:right;padding-right:5px;">' + item + '</td>'; // Note: move style to css
				}
			});
			tbody_html += '</tr>';
		});
		tbody_html += '</tbody>';
		$('#desctable').html(thead_html + tbody_html); // write table to DOM

		activate_table_sort($('#tb1')[0], json.headers[0]); // make its columns sortable
	};

	var load_table_peers = function (config, callback) {
		var table_data_src = 'data/GRtables/' + config.campus.replace(pattern2,'_') + '_' + config.cohort + '_briefplus.json' + defeat_cache;
		$.ajax({
			url: table_data_src,
			datatype: "json",
			success: function (result) {
				var json_object = (typeof result === 'string') ? JSON.parse(result) : result;
				callback(json_object, config);
			}/*,
			error: function (xhr, msg, e) {
				console.log(msg);
			}*/
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
			}/*,
			error: function (xhr, msg, e) {
				console.log(msg);
			}*/
		});
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
			chart_state.years = years[chart_state.grad_year].slice(map_years[chart_state.trends_since]);
			chart_state.notify();
			load_chart_historical_trends(chart_state,  function (json_data, chart_state) {
				retained_json_data = json_data;
				update_chart_peer_comparisons(chart_state, retained_json_data);
				update_chart_historical_trends(chart_state, retained_json_data);
			});
			load_table_peers(chart_state, create_table_peers); // Note: eliminate unnecessary data fetch
		});

		$('#year_span_selector').on('change', function (e) { // Past Three Years, Past Five Years, Since 2000
			chart_state.trends_since = e.target.value;
			chart_state.years = years[chart_state.grad_year].slice(map_years[chart_state.trends_since]);
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
			chart_state.years = years[chart_state.grad_year].slice(map_years[chart_state.trends_since]);
			retained_json_data = json_data;
			update_chart_peer_comparisons(chart_state, retained_json_data);
			update_chart_historical_trends(chart_state, retained_json_data);
		});

		/* 
		  * Custom event listeners respond to any change of tab, campus, cohort, etc.
		  */

		$('#label_year_selector').on('state_change', function () {
			if (['chart', 'trends', 'table'].indexOf(chart_state.selected_tab_name) !== -1) {
				$('#label_year_selector').show();
			} else {
				$('#label_year_selector').hide();
			}
		});
		$('#label_campus_selector').on('state_change', function () {
			if (['chart', 'trends', 'table'].indexOf(chart_state.selected_tab_name) !== -1) {
				$('#label_campus_selector').show();
			} else {
				$('#label_campus_selector').hide();
			}
		});
		$('#label_cohort_selector').on('state_change', function () {
			if (['chart', 'table'].indexOf(chart_state.selected_tab_name) !== -1) {
				$('#label_cohort_selector').show();
			} else {
				$('#label_cohort_selector').hide();
			}
		});
		$('#label_year_span_selector').on('state_change', function () {
			if (chart_state.selected_tab_name === 'trends') {
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
			chart_state.selected_tab_name = e.target.href.split('#')[1]; // i.e., one of ['chart','table','method','trends']
			chart_state.notify();
		});
	}()); // initialized
});
