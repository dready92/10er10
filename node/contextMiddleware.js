var 	path = require("path"),
		url = require("url"),
		qs = require("qs");


exports.context = function (req,res,next) { 
	req.ctx = {
		request: req,
		response: res,
		headers: {Connection: "close"},
		status: 404,
		session: {},
        remoteControlSession: {}
	};
	var u = url.parse("http://"+req.headers.host+req.url);
	req.query = u.query ? qs.parse(u.query) : {};
 	req.basepath =  path.dirname(u.pathname);
 	next();
};
