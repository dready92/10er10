
var cache = {
	total: 0,
	current: 0
};

exports.total = function(v) {
	if ( v )	cache.total++;
	else		return cache.total;
};

exports.connectionOn = function() {
	cache.current++;
};

exports.connectionOff = function() {
	cache.current--;
};

exports.active = function() {
	return cache.current;
};