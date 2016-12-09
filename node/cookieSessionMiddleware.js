var d10 = require("./d10"),
  debug = d10.debug("d10:cookieSessionMiddleware"),
  pause = require("pause"),
  when = require("./when");

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
		if ( type == "se" || type == "pr" || type == "us" || type == "rs" ) {
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
		if ( type == "se" || type == "pr" || type == "us" || type == "rs" ) {
			for ( var i in sessionCache ) {
				if ( sessionCache[i][type] && sessionCache[i][type]._id == doc._id ) {
					delete sessionCache[i];
					break;
				}
			}
		}
	}
});

var sessionCacheAdd = function(us,pr,se, rs) {
	sessionCache[us.login] =  {us:us,pr:pr,se:se,rs:rs};
};

var getd10cookie = function(ctx) {
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
        return false;
      };
      return cookieData;
    }
  }
  return false;
};

var getd10authHeader = function(ctx) {
  var authHeader = ctx.request.headers['x-10er10-auth-token'], authData;
  if (!authHeader) {
    return false;
  }
  try {
    authData = JSON.parse(unescape(authHeader));
  } catch(e) {
    debug("d10 auth header read failed", unescape(authHeader));
    return false;
  }
  return authData;
}

var getSessionDataFromCache = function(cookieData) {
  if ( sessionCache[cookieData.user] ) {
    if ( cookieData.session && sessionCache[cookieData.user].se._id == "se"+cookieData.session ) {
      return sessionCache[cookieData.user];
    } else if ( cookieData.remoteControlSession &&
                sessionCache[cookieData.user].rs._id == "rs"+cookieData.remoteControlSession ) {
      return sessionCache[cookieData.user];
    }
  }
  return false;
};

var getSessionDataFromDatabase = function(cookieData, then) {

  var sessionMatch = function(row) {
    return ( (cookieData.session && row.doc._id == "se"+cookieData.session) ||
              (cookieData.remoteControlSession && row.doc._id == "rs"+cookieData.remoteControlSession) );
  };

  d10.db.loginInfos(
    cookieData.user,
    function(response) {
      var found = false;
      response.rows.forEach(function(v,k) {
        if ( !found && sessionMatch(v) ) {
          found = {response: response, doc: v.doc};
        }
      });
      return then(null, found);
    },
    function(err) {
      then(err);
    }
  );
};

var checkAuth = function (ctx, passTheCoochie) {
  var cookieData = getd10cookie(ctx);
  if ( !cookieData ) {
    cookieData = getd10authHeader(ctx);
  }
  if ( !cookieData ) {
    return passTheCoochie();
  }
  if ( !cookieData.user || (!cookieData.session && !cookieData.remoteControlSession) ) {
    debug("cookie is missing some keys");
    return passTheCoochie();
  }
  //get from sessionCache
  var userSessionCache = getSessionDataFromCache(cookieData);
  if ( userSessionCache ) {
    ctx.user = userSessionCache.us;
    ctx.userPrivateConfig = userSessionCache.pr;
    ctx.session = userSessionCache.se || {};
    ctx.remoteControlSession = userSessionCache.rs || {};
    return passTheCoochie();
  }

  //get from database
  getSessionDataFromDatabase(cookieData, function(err,data) {
    if ( err || !data) {
      return passTheCoochie();
    }
    d10.fillUserCtx(ctx,data.response,data.doc);
    sessionCacheAdd(ctx.user,ctx.userPrivateConfig,ctx.session,ctx.remoteControlSession);
    return passTheCoochie();
  });
};



exports.cookieSession = function ( req,res,next) {
	var passTheCoochie = function() {
		handle.end();
		next();
		handle.resume();
	};
	var handle  = pause(req);
	checkAuth(req.ctx,passTheCoochie);
};

exports.getUser = function(sessionId, then) {
  for (var i in sessionCache ) {
    if ( sessionCache[i].se && sessionCache[i].se._id == 'se'+sessionId ) {
      return then ( null, sessionCache[i].us._id );
    } else if ( sessionCache[i].rs && sessionCache[i].rs._id == 'rs'+sessionId ) {
      return then ( null, sessionCache[i].us._id );
    }
  }
  var searchSession = function(then) {
    d10.couch.auth.getDoc("se"+sessionId, function(err,resp) {
      if ( err ) {
        return then(err,resp);
      }
      return then(null,"us"+resp.userid);
    });
  };

  var searchRemoteSession = function(then) {
    d10.couch.auth.getDoc("rs"+sessionId, function(err,resp) {
      if ( err ) {
        return then(err,resp);
      }
      return then(null,"us"+resp.userid);
    });
  };

  when ({se: searchSession, rs: searchRemoteSession}, function(errs, resps) {
    if ( resps.se ) {
      return then(null, resps.se);
    } else if ( resps.rs ) {
      return then(null, resps.rs);
    } else {
      return then(errs,resps);
    }
  });

};

// cache invalidation
setInterval ( function() {sessionCache = {};},1000*60*30);
