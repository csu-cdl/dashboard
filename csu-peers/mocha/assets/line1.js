(function () {
	'use strict';
	
	var chart_state ={
		'yvalue': 'gap',
		'palette': ["#f00", "#0f3", "#00f", "#0df", "#f0f", "#fe0", "#f90", "#b3a", "#f3a", "#60f", "#0af", "#0dc", "#6da", "#6ad", "#a6d", "#ad6", "#da6", "#d6a", "#6a6", "#a6a", "#a66", "#66a", "#aa6", "#6aa", "#06a", "#6a0"]
	};
	Highcharts.setOptions({
		colors: chart_state.palette
	});
	var series_state = {};

	var create_chart = function (config, data) {
		$('#chart0').highcharts({
			credits: {
				enabled: false
			},
			chart: {
				type: 'line',
				height: 500
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
					//rotation: -45,
					style: {
						fontSize: '13px',
						fontFamily: 'Verdana, sans-serif'
					}
				}
			},
			yAxis: {
				title: {
					text: '%'
				}
			},
			legend: {
				enabled: false
			},
			tooltip: {
				pointFormat: 'Rate: {point.y:.0f}%<br/>Campus: {series.name}'
			},
			legend: {
				title: {style: {'color': '#777'}, text: '(Click to show/hide campuses)'},
				layout: 'horizontal',
				align: 'center',
				verticalAlign: 'bottom',
				itemWidth: 200,
				labelFormatter: function () {
					var name = this.name;
					if (name === 'all') {
						return;
					}
					return name;
				}
			},
			series: data
		});
	};

	var load_data = function (config, callback) {
		if (cs.retained_data) {
			callback(cs.retained_data, config);
		}
		$.ajax({
			url: 'data/mocha_campus.json',
			datatype: "json",
			success: function (result) {
				var json_object = (typeof result === 'string')
					? JSON.parse(result)
					: result;
				cs.retained_data = json_object;
				callback(json_object, config);
			}
		});
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
	
	var update_chart = function (mode) {
		load_data({}, function (data, config) {
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
		update_chart();
		$('.tabtab li').on('click', function (e) {
			var tabid = e.target.nodeName === 'LI' ? e.target.id : e.target.parentNode.id;
			if (tabid === 'line') {
				update_chart(); // get selected
				$('#panel0').show();
				$('#panel1').hide();
			} else {
				update_series(1); // set selected
				cs.update_plot(1);
				$('#panel1').show();
				$('#panel0').hide();
			}
		});
		$('#yvalue_selector').on('change', function (e) {
			update_series(1); // set selected
			var value = e.target.value;
			chart_state.yvalue = {'gap':'gap', 'pell':'pell', 'gradrate':'gradrate'}[value];
			update_chart();
		});
		$('#panel1').hide();
	};
	init();

}());