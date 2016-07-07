$(document).ready(function () {
	'use strict';
	var defeat_cache = '?v=33';
	// dev only
	//var peer_benchmarking_version = '0.1';
	//console.log(peer_benchmarking_version);
	//defeat_cache = '?v=' + (new Date()).getTime();

	/* 
	  * Page level support functions and general settings, defaults
	  */

	Highcharts.setOptions({
		colors: ['#ED361B', '#058DC7', '#50B432', '#DDDF00', '#24CBE5', '#64E572', '#FF9655', '#FFF263', '#6AF9C4']
	});

	var chart_state = {
		'selected_tab_name':'chart', 'campus':'Bakersfield', 
		'grad_year':'6yr', 'cohort':'2008', 'years':[], 'peer_count':5,
		'trends_since':'0', 'type':'GR', 'max_6yr':'2008', 
		'notify':function () {
			$('.control').trigger('state_change', [this]);
		}
	};
	
	var pattern1 = new RegExp('[$%,]','g'), pattern2 = new RegExp(' ','g');

	var cohort2col_6yr = {'2000':1, '2001':2, '2002':3, '2003':4, '2004':5, '2005':6, '2006':7, '2007':8, '2008':9};
	var cohort2col_4yr = {'2000':3, '2001':4, '2002':5, '2003':6, '2004':7, '2005':8, '2006':9, '2007':10, '2008':11};
	var years = {'4yr':['2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008'],
			'6yr':['2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008']};
	var map_years = {'5':-5,'3':-3,'0':0}; // modify to match returned values from control 
	var retained_json_data, peer_campus_urls; // saves having to reload data

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

	/* 
	  * Custom event listeners respond to any change of tab, campus, cohort, etc.
	  */

	$('#label_year_selector').on('state_change', function () {
		if (chart_state.selected_tab_name === 'chart' || chart_state.selected_tab_name === 'trends' || chart_state.selected_tab_name === 'table') {
			$('#label_year_selector').show();
		} else {
			$('#label_year_selector').hide();
		}
	});
	$('#label_campus_selector').on('state_change', function () {
		if (chart_state.selected_tab_name === 'chart' || chart_state.selected_tab_name === 'trends' || chart_state.selected_tab_name === 'table') {
			$('#label_campus_selector').show();
		} else {
			$('#label_campus_selector').hide();
		}
	});
	$('#label_cohort_selector').on('state_change', function () {
		if (chart_state.selected_tab_name === 'chart' || chart_state.selected_tab_name === 'table') {
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


	//$('#year_selector').on('state_change', function (e, state) { // 4yr or 6yr
	//	// not used
	//});
	//$('#campus_selector').on('state_change', function (e, state) {
	//	// not used
	//});
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
	//$('#year_span_selector').on('state_change', function (e, state) {
	//	// not used
	//});


	/* 
	  * Functions specific to 'CSU Peer Comparisons' tab
	  */

	// create the highchart
	var create_chart_peer_comparisons = function (data) { 
		$('#container').highcharts({
			chart: {
			    type: 'column'
			},
			title: {
			    text: data.title //'Historical 6 Year Graduation Rate'
			},
			subtitle: {
			    text: data.subtitle //'2008 Cohort'
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
			    pointFormat: 'Rate:{point.y:.0f}%' //'Rate:{point.y:.1f}%'
			},
			series: [{
			    data: data.series
			}]
		});
	};

	var update_chart_peer_comparisons = function (config, json_data) {
		var i, ilen, row, col, key, value, chart_data = {'title':'', 'ylabel':'', 'series':[], 'tooltip':[], 'color':'#000'};
		if (config.grad_year === '6yr') {
			col = cohort2col_6yr[config.cohort];
		} else {
			col = cohort2col_4yr[config.cohort];
		}
		chart_data.title = config.grad_year.slice(0,1) + ' Year Graduation Rate for First-Time, Full-Time Freshmen';
		chart_data.subtitle = config.cohort + ' Cohort';
		ilen = json_data.rows.length;
		for (i = 0; i < ilen; i+=1) {
			row = json_data.rows[i];
			key = row[0];
			key = convert_csu_campus_name(key);
			key = shorten_peer_name(key);
			value = parseFloat(row[col]);

			if (key.indexOf(config.campus) !== -1) {
				chart_data.series[i] = {'name':key,'y':value,'color':'#635'};
			} else {
				chart_data.series[i] = {'name':key,'y':value,'color':'#159'};
			}
			// Exception, might be better to just check against a white-list of CSU campus names
			if (config.campus === 'Maritime Academy' && key.indexOf('California') === -1) {
				chart_data.series[i] = {'name':key,'y':value,'color':'#159'};
			}
		}
		// descending sort by y-axis value
		chart_data.series = chart_data.series.sort(function (b,a) {
			return a.y - b.y;
		}); 

		var s0 = chart_data.series[0];
		var s1 = chart_data.series[1];
		if (isNaN(s0.y)) {
			chart_data.series[0] = s1;
			chart_data.series[1] = s0;
		}

		// redisplay the chart
		create_chart_peer_comparisons(chart_data);
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
			subtitle: {
				text: '',
				x: -20
			},
			xAxis: {
				categories: config.years //['2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009', '2010']
			},
			yAxis: {
				title: {
					text: '% Grad Rate'
				},
				plotLines: [{
					value: 0,
					width: 1,
					color: '#808080'
				}]
			},
			tooltip: {
				valueSuffix: '%'
			},
			legend: {
				title: {style:{'color':'#777'}, text: '(Click to show/hide campuses)'},
				layout: 'horizontal',
				align: 'center',
				width:200,
				borderWidth: 0
			},
			series: data
		});
		$('#trends_footnote').html('*Showing ' + data[0].name + 
			' and its four top performing national peers (based on their ' + 
			config.years.slice(-1)[0] + ' cohort ' + config.grad_year[0] + '-Year graduation rates).');
	};

	// only show year_span of series (series array is sliced at position)
	var truncate_data = function (data, position) {
		var i, ilen = data.length, out = [], item, key, itemset;
		for (i = 0; i < ilen; i+=1) {
			itemset = {};
			for (key in data[i]) {
				if (data[i].hasOwnProperty(key)) {
					item = data[i][key];
					if (key === 'data') {
						itemset[key] = item.slice(map_years[position]);
					} else {
						itemset[key] = item;
					}
				}
			} 
			out.push(itemset);
		}
		return out;
	};

	var load_peer_campus_urls = function (config, callback) {
		// build (relative) source url from parts in config, e.g. 'data/GR6yr/San_Luis_Obispo_6yrGR.json'
		var chart_data_src = 'data/peer_campus_urls.json' + defeat_cache;

		// fetch json data via xhr, then invoke callback
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


	// fetch appropriate data set
	var load_chart_historical_trends = function (config, callback) {
		// build (relative) source url from parts in config, e.g. 'data/GR6yr/San_Luis_Obispo_6yrGR.json'
		var chart_data_src = 'data/' + config.type + config.grad_year + '/' + 
			config.campus.replace(pattern2,'_') + '_' + config.grad_year + config.type + '.json' + defeat_cache; //

		// fetch json data via xhr, then invoke callback
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

	// select appropriate subset of peers
	var filter_peers = function (config, json_data) {
		var i, ilen, row, name, series, rows = json_data.rows, out_data = [], selected_campus_data;
		ilen = rows.length;
		var parse_item = function (item, j, a) {
			a[j] = parseFloat(item);
			a[j] = isNaN(a[j])?null:a[j];
		};
		for (i = 0; i < ilen; i+=1) {
			row = rows[i];
			name = row[0];
			name = shorten_peer_name(name);
			series = row.slice(1);
			series.forEach(parse_item);
			//function (item, j, a) {
			//	a[j] = parseFloat(item);
			//	a[j] = isNaN(a[j])?null:a[j];
			//});
			if (config.grad_year === '4yr') { // hack to fix bad 4yr data
				series = series.slice(2); // skipping first two years (which are really 1998, 1999: not 2000, 2001)
			}
			if (name === 'California State University-' + config.campus || 
					name === 'California ' + config.campus || 
					name === 'California State Polytechnic University-' + config.campus || 
					name === 'California Polytechnic State University-' + config.campus || 
					name === config.campus + ' State University') {
				selected_campus_data = {'name':convert_csu_campus_name(name), 'data':series, 'lineWidth': 4};
			} else {
				out_data.push({'name':convert_csu_campus_name(name), 'data':series});
			}
		}
		out_data.sort(function (a,b) {
			return a.data.slice(-1)-b.data.slice(-1);
		});
		var out_data_subset = out_data.slice(1-config.peer_count);
		out_data_subset.sort(function (a,b) {
			return a.name>b.name?1:a.name===b.name?0:-1;
		});
		out_data_subset.unshift(selected_campus_data);
		return out_data_subset;
	};

	var create_table_historical_trends = function (config, peer_subset) {
		var i, ilen = peer_subset.length, line, avg, year_start, year_end, n;
		year_start = config.years[0];
		year_end = config.years.slice(-1)[0];
		n = config.grad_year[0];
		var heading = year_start + '-' + year_end + ' Average Annual Improvement in ' + n + '-Year Grad Rates';
		var detail = '<table class="table table-striped"><tbody>';
		for (i = 0; i < ilen; i+=1) {
			if (!peer_subset[i].data || peer_subset[i].data.slice(-1)[0] === null || peer_subset[i].data[0] === null) {
				line = '<tr><td>' + peer_subset[i].name + '</td><td class="nowrap" style="min-width:3em;text-align:right;">' + 'n/a</td></tr>'; // Note: style to css
			} else {
				avg = '0.0'; // avoid divide by zero
				if (peer_subset[i].data && peer_subset[i].data.length) {
					avg = '' + Math.round(10.0 * (peer_subset[i].data.slice(-1)[0] - peer_subset[i].data[0]) / (peer_subset[i].data.length - 1))/10.0;
				}
				if (avg.split('.').length === 1) {
					avg += '.0';
				}
				line = '<tr><td>' + peer_subset[i].name + '</td><td class="nowrap" style="min-width:3em;text-align:right;">' + avg + ' % points</td></tr>'; // Note: style to css
			}
			detail += line;
		}
		detail += '</tbody></table>';
		$('#text_panel_0').html('<h3>' + heading + '</h3>' + detail);
	};

	/* 
	  * Functions related to 'Data Tables' tab
	  */

	//var forEach = function (array, callback, scope) {
	//	var i, ilen = array.length;
	//	for (i = 0; i < ilen; i+=1) {
	//		callback.call(scope, array[i], i, array);
	//	}
	//};

	var sortcol = function (tbody, col, direction) {
		var i, ilen = tbody.children.length, trs = [], tr, td, row, frag;
		for (i = 0; i < ilen; i+=1) {
			tr = tbody.children[i];
			td = tr.children[col].innerText;
			trs[i] = [td,i,tr.innerHTML,tr.className || ''];
		}
		frag = document.createDocumentFragment();
		if (direction === 'ascending') {
			trs.sort(function (a,b) {
				var aa = a[0].toUpperCase(), bb = b[0].toUpperCase();
				aa = aa.indexOf('ds*') !== -1?'$0':aa;
				bb = bb.indexOf('ds*') !== -1?'$0':bb;
				aa = aa.replace(pattern1,'');
				bb = bb.replace(pattern1,'');
				aa = isNaN(parseFloat(aa))?aa:parseFloat(aa);
				bb = isNaN(parseFloat(bb))?bb:parseFloat(bb);
				return aa>bb?1:aa===bb?0:-1;
			});
		} else {
			trs.sort(function (b,a) {
				var aa = a[0].toUpperCase(), bb = b[0].toUpperCase();
				aa = aa.indexOf('ds*') !== -1?'$0':aa;
				bb = bb.indexOf('ds*') !== -1?'$0':bb;
				aa = aa.replace(pattern1,'');
				bb = bb.replace(pattern1,'');
				aa = isNaN(parseFloat(aa))?aa:parseFloat(aa);
				bb = isNaN(parseFloat(bb))?bb:parseFloat(bb);
				return aa>bb?1:aa===bb?0:-1;
			});
		}
		ilen = trs.length;
		for (i = 0; i < ilen; i+=1) {
			row = document.createElement('tr');
			if (trs[i][3].indexOf('highlight') !== -1) {
				row.className = "highlight";
			}
			row.innerHTML = trs[i][2];
			frag.appendChild(row);
		}
		tbody.innerHTML = '';
		tbody.appendChild(frag,tbody);
	};

	var sort_toggle_state = {}; // for toggling sort direction
	var create_table_peers = function (json, config) {
		var out = '<thead><tr>';
		var one_or_two, header_copy = json.headers[0];
		if (config.grad_year === '4yr') { // remove 2nd and possibly 3rd column, insert last column
			one_or_two = (header_copy[2] === 'Underrepresented Minority 6-Year Grad Rate') ? 2 : 1;
			header_copy.splice(1,one_or_two,header_copy.splice(-1,1)[0]); // remove 6yr column(s) and move last column to 2nd column position
			header_copy[1] = config.cohort + '&nbsp;4yr Grad&nbsp;Rate';
		} else { // 6yr
			header_copy.splice(-1,1); // simply remove last col
		}
		header_copy.forEach(function (item,i) {
			item = (item === 'Main') ? 'Campus': item;
			item = (item === 'Underrepresented Minority 6-Year Grad Rate') ? 'URM 6-Year Grad Rate': item;
			item = (item === '% Pell Recipients Among Freshmen') ? '% Pell Eligible': item;
			item = (item === '% Underrepresented Minority') ? '% URM': item;
			item = (item === 'Average High School GPA Among College Freshmen') ? 'Average High School GPA': item;
			item = (item === 'Estimated Median SAT / ACT') ? 'Average SAT&nbsp;Score': item;
			item = (item === 'Size (Undergrad FTE)') ? '(Undergrad FTE)&nbsp;Size': item;
			item = item.replace('Grad Rate','Grad&nbsp;Rate');
			//item = (item === '') ? '': item; // pattern
			if (i === 0) {
				out += '<th id="col_' + i + '" class="col_campus">' + item + '</th>'; 
			} else {
				out += '<th id="col_' + i + '"  style="text-align:right;padding-right:5px;">' + item + '</th>';  // Note: move style to css
			}
		});
		out += '</tr></thead><tbody id="tb1">';
		var out3 = '';
		json.rows.forEach(function (row) {
			//var highlight = false, 
			var row_copy = row.slice();
			if (config.grad_year === '4yr') { // remove 2nd and possibly 3rd column, insert last column
				row_copy.splice(1,one_or_two,row_copy.splice(-1,1)[0]); // remove 6yr column(s) and move last column to 2nd column position
			} else { // 6yr
				row_copy.splice(-1,1); // simply remove last col
			}
			row_copy.forEach(function (item,i) {
				var name,link;
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
					out3 += '<tr';
					name = shorten_peer_name(name);
					if (name === 'California State University-' + config.campus || 
						name === 'California ' + config.campus || 
						name === 'California State Polytechnic University-' + config.campus || 
						name === 'California Polytechnic State University-' + config.campus || 
						name === config.campus + ' State University') {
						out3 += ' class="highlight">'; // Should just use '.highlight' to style
						out3 += '<td class="col_campus"><a href="' + link + '" target="_blank" style="color:#b33;text-decoration:underline;">'; // Note: move style to css
						out3 += convert_csu_campus_name(name) + '</a></td>';
					} else {
						out3 += '><td class="col_campus"><a href="' + link + '" target="_blank" style="color:#111;text-decoration:underline;">'; // Note: move style to css
						out3 += convert_csu_campus_name(name) + '</a></td>';
					}
				} else {
					out3 += '<td style="text-align:right;padding-right:5px;">' + item + '</td>'; // Note: move style to css
				}
			});
			out3 += '</tr>';
		});

		out3 += '</tbody>';
		$('#desctable').html(out + out3);
		var cols = [];
		json.headers[0].forEach(function (item,i) {
			var ord = 'ord' + i;
			cols.push('#col_' + i);
			$(cols[i]).on('click', function () {
				var tbody = document.querySelector('#tb1');
				if (!sort_toggle_state[ord] || sort_toggle_state[ord] !== 'ascending') { // toggle
					sort_toggle_state[ord] = 'ascending';
				} else {
					sort_toggle_state[ord] = 'descending';
				}
				sortcol(tbody, i, sort_toggle_state[ord]);
			});
		});
	};

	var load_table_peers = function (config, callback) {
		var table_data_src = 'data/GRtables/' + config.campus.replace(pattern2,'_') + '_' + config.cohort + '_briefplus.json' + defeat_cache;
		$.ajax({
			url: table_data_src,
			datatype: "json",
			success: function (result) {
				// fix inconsistencies with server handling .json files
				var json_object = (typeof result === 'string') ? JSON.parse(result) : result;
				// once data is loaded invoke callback
				callback(json_object, config);
			}/*,
			error: function (xhr, msg, e) {
				console.log(msg);
			}*/
		});
	};

	var update_chart_historical_trends = function (config, json_data) {
		var peer_subset = filter_peers(config, json_data);
		create_chart_historical_trends(config, truncate_data(peer_subset, config.years.length));
		create_table_historical_trends(config, truncate_data(peer_subset, config.years.length));
	};

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

	chart_state.notify();
	
	//load_chart_peer_comparisons(chart_state, update_chart_peer_comparisons);

	load_peer_campus_urls(chart_state, function (json_data, chart_state) {
		peer_campus_urls = json_data;
		load_table_peers(chart_state, create_table_peers); // order dependency
	});

	load_chart_historical_trends(chart_state, function (json_data, chart_state) {
		chart_state.years = years[chart_state.grad_year].slice(map_years[chart_state.trends_since]);
		retained_json_data = json_data;
		update_chart_peer_comparisons(chart_state, retained_json_data);
		update_chart_historical_trends(chart_state, retained_json_data);
	});

	/* 
	  * Activate tab navigation
	  */

	$(".nav-tabs a").click(function(){
		$(this).tab('show');
		chart_state.selected_tab_name = this.href.split('#')[1]; // i.e., one of ['chart','table','method','trends']
		chart_state.notify();
	});
});

