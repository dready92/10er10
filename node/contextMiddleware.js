var 	path = require("path"),
		url = require("url"),
		lang = require("./lang");


exports.context = function (req,res,next) { 
	req.ctx = {
		request: req,
		response: res,
		headers: {Connection: "close"},
		status: 404,
		session: {}
	};
	var u = url.parse("http://"+req.headers.host+req.url, true);
	req.query = u.query || {};
 	req.basepath =  path.dirname(u.pathname);
 	next();
};
