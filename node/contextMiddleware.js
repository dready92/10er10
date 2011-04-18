var 	path = require("path"),
	url = require("url");


exports.context = function (req,res,next) { 
	req.ctx = {
		request: req,
		response: res,
		headers: {},
		status: 404,
		session: {}
	};
	var u = url.parse("http://"+req.headers.host+req.url, true);
	req.query = u.query || {};
 	req.basepath =  path.dirname(u.pathname);
 	next();
};
