const d10 = require('../../d10');

const debug = d10.debug('d10:cookieSessionMiddleware');
const pause = require('pause');
const when = require('../../when');

let sessionCache = {};

function isSessionRelatedDocType(docType) {
  return docType === 'se' || docType === 'pr' || docType === 'us' || docType === 'rs';
}

d10.couch.auth.on('save', (err, doc) => {
  if (err) {
    return;
  }
  const type = doc._id.substr(0, 2);
  if (!isSessionRelatedDocType(type)) {
    return;
  }
  Object.keys(sessionCache).forEach((key) => {
    if (sessionCache[key][type] && sessionCache[key][type]._id === doc._id) {
      sessionCache[key][type] = doc;
    }
  });
});

d10.couch.auth.on('delete', (err, doc) => {
  if (err) {
    return;
  }
  const type = doc._id.substr(0, 2);
  if (!isSessionRelatedDocType(type)) {
    return;
  }

  Object.keys(sessionCache).forEach((key) => {
    if (sessionCache[key][type] && sessionCache[key][type]._id === doc._id) {
      delete sessionCache[key][type];
    }
  });
});

function sessionCacheAdd(us, pr, se, rs) {
  sessionCache[us.login] = { us, pr, se, rs };
}

function getd10cookie(ctx) {
  const cookies = {};
  if (!ctx.request.headers.cookie) {
    return false;
  }
  ctx.request.headers.cookie.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    cookies[parts[0].trim()] = (parts[1] || '').trim();
  });
  if (cookies[d10.config.cookieName]) {
    let cookieData;
    try {
      cookieData = JSON.parse(unescape(cookies[d10.config.cookieName]));
    } catch (e) {
      debug('cookie read failed', unescape(cookies[d10.config.cookieName]));
      return false;
    }
    return cookieData;
  }
  return false;
}

function getd10authHeader(ctx) {
  const authHeader = ctx.request.headers['x-10er10-auth-token'];
  let authData;
  if (!authHeader) {
    return false;
  }
  try {
    authData = JSON.parse(unescape(authHeader));
  } catch (e) {
    debug('d10 auth header read failed', unescape(authHeader));
    return false;
  }
  return authData;
}

function getSessionDataFromCache(cookieData) {
  if (sessionCache[cookieData.user]) {
    if (cookieData.session && sessionCache[cookieData.user].se._id === `se${cookieData.session}`) {
      return sessionCache[cookieData.user];
    } else if (cookieData.remoteControlSession &&
                sessionCache[cookieData.user].rs._id === `rs${cookieData.remoteControlSession}`) {
      return sessionCache[cookieData.user];
    }
  }
  return false;
}

function getSessionDataFromDatabase(cookieData, then) {

  function sessionMatch(row) {
    return ((cookieData.session && row.doc._id === `se${cookieData.session}`) ||
              (cookieData.remoteControlSession && row.doc._id === `rs${cookieData.remoteControlSession}`));
  }

  d10.db.loginInfos(
    cookieData.user,
    (response) => {
      let found = false;
      response.rows.forEach((v) => {
        if (!found && sessionMatch(v)) {
          found = { response, doc: v.doc };
        }
      });
      return then(null, found);
    }, then);
}

function checkAuth(ctx, passTheCoochie) {
  /* eslint no-param-reassign: ["error", { "props": false }] */
  const cookieData = getd10cookie(ctx) || getd10authHeader(ctx);
  if (!cookieData) {
    return passTheCoochie();
  }
  if (!cookieData.user || (!cookieData.session && !cookieData.remoteControlSession)) {
    debug('cookie is missing some keys');
    return passTheCoochie();
  }
  // get from sessionCache
  const userSessionCache = getSessionDataFromCache(cookieData);
  if (userSessionCache) {
    ctx.user = userSessionCache.us;
    ctx.userPrivateConfig = userSessionCache.pr;
    ctx.session = userSessionCache.se || {};
    ctx.remoteControlSession = userSessionCache.rs || {};
    return passTheCoochie();
  }

  // get from database
  return getSessionDataFromDatabase(cookieData, (err, data) => {
    if (err || !data) {
      return passTheCoochie();
    }
    d10.fillUserCtx(ctx, data.response, data.doc);
    sessionCacheAdd(ctx.user, ctx.userPrivateConfig, ctx.session, ctx.remoteControlSession);
    return passTheCoochie();
  });
}

exports.cookieSession = function cookieSession(req, res, next) {
  function passTheCoochie() {
    handle.end();
    next();
    handle.resume();
  }
  let handle = pause(req);
  checkAuth(req.ctx, passTheCoochie);
};

/* TODO: this doesn't belong to the middleware */
exports.getUser = function getUser(sessionId, then) {
  let userId;
  Object.keys(sessionCache).forEach((v) => {
    if ((v.se && v.se._id === `se${sessionId}`) || (v.rs && v.rs._id === `rs${sessionId}`)) {
      userId = v.us._id;
    }
  });
  if (userId) {
    return then(null, userId);
  }

  function onResponse(then2, err, resp) {
    if (err) {
      return then2(err, resp);
    }
    return then2(null, `us${resp.userid}`);
  }

  function searchSession(then2) {
    d10.couch.auth.getDoc(`se${sessionId}`, (err, resp) => { onResponse(then2, err, resp); });
  }

  function searchRemoteSession(then2) {
    d10.couch.auth.getDoc(`rs${sessionId}`, (err, resp) => { onResponse(then2, err, resp); });
  }

  return when({ se: searchSession, rs: searchRemoteSession }, (errs, resps) => {
    if (resps.se) {
      return then(null, resps.se);
    } else if (resps.rs) {
      return then(null, resps.rs);
    } else {
      return then(errs, resps);
    }
  });
};

// cache invalidation
setInterval(() => { sessionCache = {}; }, 1000 * 60 * 30);
