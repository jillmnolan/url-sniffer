#!/usr/bin/env node
'use strict';

const pkg     = require('../package.json');
const program = require('commander-plus');
const Table   = require('cli-table');
var colors    = require('colors');

const main = function() {
	const chain = Promise.resolve()
	.then(setup)
	.then(process_options)
	// .then(ask_for_missing_paramaters)
	.then(split_urls)
	.then(check_urls)
	.catch(function(err) {
		process.stdin.destroy();
		console.error(err);
	})
	// done
	.then(display_results)
}

const setup = function() {
	program
		.version(pkg.version)
		.option('-u, --url <url>','URL to parse')
		.option('-d, --delineator [/]','string to split url on')
		.option('-s, --single','Include single segments, i.e. "www" or "com"')
		.option('-b, --base','Modify the base url, i.e. try "www.com" when sniffing "www.google.com"')
		.option('-D, --diff','Show the difference in the URL')
		.parse(process.argv);
}

const process_options = function() {
	const paramaters = {
		urls: null,
		delineators: "/",
		single: false,
		base: false,
		diff: false
	};

	if (program.args.length > 0) {

		paramaters.urls = [];
		for (var i = 0; i < program.args.length; i++) {

			paramaters.urls.push(program.args[i]);
		}

	}
	if (program.url !== undefined) safe_add_key_value(paramaters, "urls", program.url);
	if (program.delineator !== undefined) paramaters.delineators = program.delineator || paramaters.delineators;
	paramaters.single = (program.single === true);
	paramaters.base = (program.base === true);
	paramaters.diff = (program.diff === true);

	return paramaters;
}

const safe_add_key_value = function(object, key, value) {

	if (object.hasOwnProperty(key)) {
		if (object[key] === null) {
			object[key] = [];
		}

		object[key].push(value);
	}
}

const ask_for_missing_paramaters = function(paramaters) {
	const paramater_prompts = {
		urls: 'Please enter a URL to sniff: ',
		delineators: 'Please enter a String to split the URLs on: '
	};

	return new Promise((resolve, reject) => {
		const missing = [];
		for (var key in paramaters) {
			if (paramaters.hasOwnProperty(key) && paramaters[key] == null) {
				missing.push(key);
			}
		}
		const syncronous_loop = function(x) {
			program.prompt(paramater_prompts[missing[x]], function(input){
				safe_add_key_value(paramaters, missing[x], input);
				if (x < (missing.length - 1)) {
					if (input.length === 0) {
						syncronous_loop(x + 1);
					} else {
						syncronous_loop(x);
					}
				} else {
					resolve(paramaters);
				}
			});
		}
		if (missing.length > 0) {
			syncronous_loop(0);
		} else {
			resolve(paramaters);
		}
	})
	.then(function(paramaters) {
		process.stdin.destroy();
		return paramaters;
	});
}

const split_urls = function(paramaters) {
	if (   paramaters.urls               === null
		|| paramaters.urls.length        === 0
		|| paramaters.delineators        === null
		|| paramaters.delineators.length === 0) {
		throw new Error("Missing Required Paramaters.");
	}

	const all_url_data = [];
	for (var i = 0; i < paramaters.urls.length; i++) {
		var url = paramaters.urls[i];
		var protocall = (url.startsWith('http') ? url.split("://")[0] : 'http');
		var whole_url = (url.startsWith('http') ? url.split("://")[1] : url);
		var base_url = whole_url.split("/")[0];
		var path = whole_url.substring(whole_url.indexOf("/"));
		var url_data = {
			original_url: url,
			protocall: protocall,
			whole_url: whole_url,
			base_url: base_url,
			path: path,
			segments: []
		};
		url_data.segments.push((paramaters.base ? url_data.whole_url : ""));
		if (paramaters.delineators.length === 1 && paramaters.delineators[0] === '') {
			if (url_data.base_url.length > 12) {
				throw new Error("Too many combinations, please use a delineator.")
			}
			split_url_each_char(paramaters, url_data.base_url, url_data.segments);
		} else {
			split_url(paramaters, (paramaters.base ? url_data.whole_url : url_data.path), url_data.segments);
		}
		all_url_data.push(url_data);
	}
	return {
		paramaters: paramaters,
		all_url_data: all_url_data
	};
}

const split_url_each_char = function(paramaters, url, array) {
	if (url.length === 0) {
		return;
	}
	for (var i = 0; i < url.length; i++) {
		var short = remove_at_index(url, i);
		if (array.indexOf(short) === -1) {
			array.push(short)
			split_url_each_char(paramaters, short, array);
		}
	}
}

const split_url = function(paramaters, url, array) {
	if (url.length === 0) {
		return;
	}

	var peices = url.split(paramaters.delineators);

	if (peices.length < 1 || (!paramaters.single && paramaters.base && peices.length < 3)) {
		return;
	}
	for (var i = 0; i < peices.length; i++) {
		var short = url;

		if (i === 0) {
			short = short.substring(short.indexOf(peices[i + 1]));
		} else if (i === peices.length - 1) {
			short = short.substring(0, short.indexOf(peices[i - 1]) + peices[i - 1].length);
		} else {
			short = short.substring(0, short.indexOf(peices[i])) + short.substring(short.indexOf(peices[i + 1]));
		}

		if (short.startsWith("/")) {
			short = short.substring(1);
		}

		if (array.indexOf(short) === -1) {
			array.push(short);
			split_url(paramaters, short, array);
		}
	}
}

const check_urls = function() {
	const paramaters   = arguments[0].paramaters
	const all_url_data = arguments[0].all_url_data;
	const promises = [];
	for (var url = 0; url < all_url_data.length; url++) {
		for (var segment = 0; segment < all_url_data[url].segments.length; segment++) {
			promises.push(check_url(
				all_url_data[url].protocall,
				(paramaters.base ?
					all_url_data[url].segments[segment] :
					all_url_data[url].base_url + "/" + all_url_data[url].segments[segment]
				),
				all_url_data[url].whole_url
			));
		}
	}
	return Promise.all(promises)
		.then((response_data) => {
			return {
				paramaters: paramaters,
				response_data: response_data
			}
		});
}

const check_url = function(protocall, base_url, whole_url) {
	const url = protocall + "://" + base_url;
	// return new pending promise
	return new Promise((resolve, reject) => {
		// select http or https module, depending on reqested url
		const lib = url.startsWith('https') ? require('https') : require('http');
		const request = lib.get(url, (response) => {
			resolve([base_url, response.statusCode, whole_url]);
		});
		// handle connection errors of the request
		request.on('error', (err) => resolve([base_url, "", whole_url]));
		})
};

const display_results = function() {
	const paramaters    = arguments[0].paramaters
	const response_data = arguments[0].response_data;

	var url_width = 0;
	for (var i = 0; i < paramaters.urls.length; i++) {
		url_width = Math.max(paramaters.urls[i].length, url_width);
	}
	if ((typeof url_width) === 'string') {
		url_width = url_width.length;
	}

	var options = {

		head: ['URL', 'Response', 'Diff'],
		colWidths: [url_width - 5, 10, response_data[0][2].length - response_data[0][0].length + 2],
		chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
		style: {head: ['white'], border: ['white']}

	}

	if (!paramaters.diff) {
		options.head.pop();
		options.colWidths.pop();
	}

	var table = new Table(options);
	for (var i = 0; i < response_data.length; i++) {
		response_data[i][1] = response_data[i][1].toString();
		response_data[i][2] = string_diff(response_data[i][0], response_data[i][2]);
		if (response_data[i][1] === "200") {
			response_data[i][0] = response_data[i][0].green;
			response_data[i][1] = response_data[i][1].green;
			response_data[i][2] = response_data[i][2].green;
		} else if (response_data[i][1].startsWith("3")) {
			response_data[i][0] = response_data[i][0].yellow;
			response_data[i][1] = response_data[i][1].yellow;
			response_data[i][2] = response_data[i][2].yellow;
		} else {
			response_data[i][0] = response_data[i][0].red;
			response_data[i][1] = response_data[i][1].red;
			response_data[i][2] = response_data[i][2].red;
		}
		if (!paramaters.diff) {
			response_data[i].pop();
		}
		table.push(response_data[i]);
	}
	console.log(table.toString());

}




const remove_at_index = function(obj, index) {
	return obj.slice(0, index) + obj.slice(index + 1);
}

const string_diff = function(a, b)
{
    var i = 0;
    var j = 0;
    var result = "";

    while (j < b.length)
    {
        if (a[i] != b[j] || i == a.length)
            result += b[j];
        else
            i++;
        j++;
    }
    return result;
}

main();
