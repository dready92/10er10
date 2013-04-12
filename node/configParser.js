var fs = require("fs");
var config = require("./config");
var mergedConfig = false;

var deepMerge = function(a,b) {
	for ( var i in a ) {
		var aType = getType(a,i);
		var bType = getType(b,i);
		//special cases
		if ( bType == "undefined" ) {
			continue;
		}
		if ( aType == "undefined" ) {
			if ( bType != "undefined" )	continue;
			else			a[i] = b[i];
		} else if ( aType != bType ) {
			a[i] = b[i];
		} else if ( aType == "array" ) {
			b[i].forEach(function(v) {
				a[i].push(v);
			});
		} else if ( aType == "object" ) {
			deepMerge(a[i],b[i]);
		} else {
			a[i] = b[i];
		}
	}
	return a;
};

var getType = function(obj, key, undefined) {
	if ( obj[key] === undefined ) {
		return "undefined";
	}
	if ( Object.prototype.toString.call(obj[key]) === '[object Array]' ) {
		return "array";
	}
	if ( typeof obj[key] == "object" ) {
		return "object";
	}
	return "scalar";
};




exports.getConfig = function(callback) {
	if ( mergedConfig ) {
		return callback(null,config);
	}
	fs.stat("./config.local.js",function(err,resp) {
		if ( err ) {
			mergedConfig = true;
		} else {
			var localConfig = require("./config.local");
			deepMerge(config,localConfig);
			mergedConfig = true;
		}
		callback(null,config);
	});
};

exports.switchProd = function() {
	if ( !mergedConfig ) {return ;}	
	config.port = config.port_prod;
	config.production = true;
	config.couch = config.couch_prod;
};

exports.switchDev = function() {
	if ( !mergedConfig ) {return ;}	
	config.port = config.port_dev;
	config.production = false;
	config.couch = config.couch_dev;
};