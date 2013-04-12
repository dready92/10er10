var d10 = require("./d10"),
  debug = d10.debug("d10:cookieSessionMiddleware"),
  utils = require("connect").utils;

	/*
	 * {
	 * "login": {
	 * se
	 * pr
	 * us
	 */
var sessionCache = {};

d10.couch.auth.on("save",function(err,doc) {
	if ( ! err ) {
		var type = doc._id.substr(0,2);
		if ( type == "se" || type == "pr" || type == "us" ) {
			for ( var i in sessionCache ) {
				if ( sessionCache[i][type] && sessionCache[i][type]._id == doc._id ) {
					sessionCache[i][type] = doc;
					break;
				}
			}
		}
	}
});

d10.couch.auth.on("delete",function(err,doc) {
	if ( ! err ) {
		var type = doc._id.substr(0,2);
		if ( type == "se" || type == "pr" || type == "us" ) {
			for ( var i in sessionCache ) {
				if ( sessionCache[i][type] && sessionCache[i][type]._id == doc._id ) {
					delete sessionCache[i];
					break;
				}
			}
		}
	}
});

var sessionCacheAdd = function(us,pr,se) {
	sessionCache[us.login] =  {us:us,pr:pr,se:se};
};

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
				debug("cookie read failed", unescape(cookies[d10.config.cookieName])); 
				return passTheCoochie(); 
				
			};
			if ( cookieData && cookieData.user && cookieData.session ) {
				//get from sessionCache
				if ( sessionCache[cookieData.user] ) {
					if ( sessionCache[cookieData.user].se._id == "se"+cookieData.session ) {
						ctx.user = sessionCache[cookieData.user].us;
						ctx.userPrivateConfig = sessionCache[cookieData.user].pr;
						ctx.session = sessionCache[cookieData.user].se;
						return passTheCoochie();
					}
				}
				
				d10.db.loginInfos(
					cookieData.user, 
					function(response) {
						var found = false;
						response.rows.forEach(function(v,k) {
							if ( !found && v.doc._id == "se"+cookieData.session ) {
								d10.fillUserCtx(ctx,response,v.doc);
								sessionCacheAdd(ctx.user,ctx.userPrivateConfig,ctx.session);
								found = true;
							}
						});
						return passTheCoochie();
					}, 
					function() {return passTheCoochie();}
					);
			} else {
				return passTheCoochie();
			}
		} else {
			return passTheCoochie();
		}
	} else {
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

exports.getUser = function(sessionId, then) {
  for (var i in sessionCache ) {
    if ( sessionCache[i].se && sessionCache[i].se._id == 'se'+sessionId ) {
      return then ( null, sessionCache[i].us._id );
    }
  }
  
  d10.couch.auth.getDoc("se"+sessionId, function(err,resp) {
    if ( err ) {
      return then(err,resp);
    }
    return then(null,"us"+resp.userid);
  });
  
};

// cache invalidation
setInterval ( function() {sessionCache = {};},1000*60*30);