var 	path = require("path"),
		url = require("url"),
		qs = require("qs"),
		d10 = require("./d10");


exports.context = function (req,res,next) { 
	req.ctx = {
		request: req,
		response: res,
		headers: {},
		status: 404,
		session: {},
        remoteControlSession: {},
        setCookie: function(cookie) {
          var d = new Date();
          d.setTime ( d.getTime() + d10.config.cookieTtl );
          this.headers["Set-Cookie"] = d10.config.cookieName+
                                              "="+
                                              escape(JSON.stringify(cookie))+
                                              "; expires="+d.toUTCString()+
                                              "; path="+d10.config.cookiePath;
        }
	};
	var u = url.parse("http://"+req.headers.host+req.url);
	req.query = u.query ? qs.parse(u.query) : {};
 	req.basepath =  path.dirname(u.pathname);
 	next();
};
