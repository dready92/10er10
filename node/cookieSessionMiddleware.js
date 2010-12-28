var d10 = require("./d10"),
	utils = require("connect/utils");

var checkAuth = function (ctx,passTheCoochie) {	
	var cookies = {};
	if ( ctx.request.headers.cookie ) {
		ctx.request.headers.cookie.split(';').forEach(function( cookie ) {
			var parts = cookie.split('=');
			cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
		});
		if ( cookies[d10.config.cookieName] ) {
			var cookieData;
			try {
				cookieData = JSON.parse(unescape(cookies[d10.config.cookieName]));
			} catch (e) { 
				d10.log("cookie read failed", unescape(cookies[d10.config.cookieName])); 
				// 				ctx.request.paused = false;
				// 				ctx.request.resume(); 
				return passTheCoochie(); 
				
			};
// 			d10.log("debug",ctx.request.url,2);

			if ( cookieData && cookieData.user && cookieData.session ) {
				d10.db.loginInfos(
					cookieData.user, 
					function(response) {
// 						d10.log("debug",ctx.request.url,4);
						response.rows.forEach(function(v,k) {
							if ( v.doc._id == "se"+cookieData.session ) {
								d10.fillUserCtx(ctx,response,v.doc);
								d10.log("debug",ctx.request.url+": "+ctx.user.login," is now logged");
								// 								d10.log("debug",ctx);
								return false;
							}
						});
						return passTheCoochie();
					}, 
					function() {/*ctx.request.paused = false;ctx.request.resume();*/return passTheCoochie();}
					);
			} else {
				// 				ctx.request.paused = false;
				// 				ctx.request.resume();
				return passTheCoochie();
			}
		} else {
			// 			ctx.request.paused = false;
			// 			ctx.request.resume();
			return passTheCoochie();
		}
	} else {
		// 		ctx.request.paused = false;
		// 		ctx.request.resume();
		return passTheCoochie();
	}
	
	
};





exports.cookieSession = function ( req,res,next) {
	var passTheCoochie = function() {
		pause.end();
		next();
		pause.resume();
	};
	
	var pause = utils.pause(req);
	checkAuth(req.ctx,passTheCoochie);
};