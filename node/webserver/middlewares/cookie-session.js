const d10 = require('../../d10');
const sessionService = require('../../session');

const debug = d10.debug('d10:cookieSession');
const pause = require('pause');

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
  const userSessionCache = sessionService.getSessionDataFromCache(cookieData);
  if (userSessionCache) {
    debug('Found session in cache');
    ctx.user = userSessionCache.us;
    ctx.userPrivateConfig = userSessionCache.pr;
    ctx.session = userSessionCache.se || {};
    ctx.remoteControlSession = userSessionCache.rs || {};
    return passTheCoochie();
  }

  // get from database
  return sessionService.getSessionDataFromDatabase(cookieData, (err, data) => {
    if (err || !data) {
      return passTheCoochie();
    }
    debug('Found session in datastore');
    sessionService.fillUserCtx(ctx, data.response, data.doc);
    sessionService.sessionCacheAdd(ctx.user, ctx.userPrivateConfig, ctx.session, ctx.remoteControlSession);
    return passTheCoochie();
  });
}

exports.cookieSession = function cookieSession(req, res, next) {
  if (req.ctx.hasSession()) {
    return next();
  }

  function passTheCoochie() {
    handle.end();
    next();
    handle.resume();
  }
  let handle = pause(req);

  return checkAuth(req.ctx, passTheCoochie);
};
