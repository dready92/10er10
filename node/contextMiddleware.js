var 	path = require("path"),
		url = require("url"),
		lang = require("./lang"),
		utils = require("connect").utils;


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
//  	next();
	var passTheCoochie = function() {
		pause.end();
		next();
		pause.resume();
	};
	var pause = utils.pause(req);
	lang.getHeadersLang(req,function(lng) {
		req.ctx.lang = lng;
		passTheCoochie();
	});
};
