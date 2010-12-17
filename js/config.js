exports.couch = {
	d10: {dsn: "http://localhost:5984/",database:"d10"},
	auth: {dsn: "http://localhost:5984/",database:"auth"},
	d10: {dsn: "http://localhost:5984/",database:"track"}
};

exports.javascript = {
	includes : [
		"modernizr-1.5.min.js",
		"jquery.sprintf.js",
		"jquery.tools.min.js",
		"jquery.csstransform.js",
		"jquery.ovlay.js",
		"jquery.includes.js",
		"dnd.js",
		"utils.js",
		"track.js",
		"player.js",
		"menumanager.js",
		"httpbroker.js",
		"playlist.js",
		"paginer.js",
		"plm.js",
		"my.js",
		"upload.js",
		"library.js",
		"welcome.js",
		"results.js",
		"user.js",
		"osd.js",
		"localcache.js",
		"bgtask.js"
	]
};
exports.templates = {
	node: "../d10/views/"
};