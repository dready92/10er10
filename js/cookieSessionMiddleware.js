var d10 = require("./d10"),

// d10db = require("./d10db"),
// 	d10data = require("./d10data"),
	utils = require("connect/utils");

var checkAuth = function (ctx,passTheCoochie) {	
	var cookies = {};
	if ( ctx.request.headers.cookie ) {
		ctx.request.headers.cookie.split(';').forEach(function( cookie ) {
			var parts = cookie.split('=');
			cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
		});
		console.log(ctx.request.url,1);
		if ( cookies[d10.config.cookieName] ) {
			// 			console.log("found my cookie");
			var cookieData;
			try {
				cookieData = JSON.parse(unescape(cookies[d10.config.cookieName]));
			} catch (e) { 
				console.log("cookie read failed", unescape(cookies[d10.config.cookieName])); 
				// 				ctx.request.paused = false;
				// 				ctx.request.resume(); 
				return passTheCoochie(); 
				
			};
			console.log(ctx.request.url,2);
			// 			console.log("cookie data : ",cookieData);
			if ( cookieData && cookieData.user && cookieData.session ) {
				// 				console.log("cookie got user and session");
				console.log(ctx.request.url,3);
				d10.db.loginInfos(
					cookieData.user, 
					function(response) {
						console.log(ctx.request.url,4);
						// 						console.log(response);
						response.rows.forEach(function(v,k) {
							console.log(ctx.request.url,v.doc._id);
							if ( v.doc._id == "se"+cookieData.session ) {
								// 								ctx.session = v.doc;
								// 								console.log("found user session");	
								d10.fillUserCtx(ctx,response,v.doc);
								console.log(ctx.request.url+": "+ctx.user.login," is now logged");
								// 								console.log(ctx);
								return false;
							}
						});
						// 						console.log("next1");
						// 						ctx.request.paused = false;
						// 						ctx.request.resume();
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
	
	// 	console.log("here 1 !");
	var pause = utils.pause(req);
	checkAuth(req.ctx,passTheCoochie);
};