const { URL } = require('url');
const d10 = require('../../d10');
const debug = d10.debug('d10:apikeysMiddleware');
const sessionService = require('../../session');

module.exports = {
  loginUsingHeader,
  loginUsingPath
};

function loginUsingHeader(req, res, next) {
  if (req && req.ctx && req.ctx.hasSession()) {
    return next();
  }

  if (!req.headers['api-key']) {
    return next();
  }

  const apikey = req.headers['api-key'];

  return setupEnvUsingApikey(req, apikey, next);
}

function loginUsingPath(req, res, next) {
  if (req && req.ctx && req.ctx.hasSession()) {
    return next();
  }

  const regmatch = req.url.split('/');
  if (regmatch.length < 4) {
    return next();
  }
  if (regmatch[1] !== 'apikeys') {
    return next();
  }

  const apikey = regmatch[2];

  regmatch.splice(1, 2);

  return setupEnvUsingApikey(req, apikey, () => {
    console.log(req);
    req.url = regmatch.join('/');
    next();
  });
}

function setupEnvUsingApikey(req, apikey, next) {
  const ctx = req.ctx;

  d10.couch.auth.view('apikeys/id', { key: apikey, include_docs: true }, (err, resp) => {
    if (err) {
      console.log('apikey logUsingHeader middleware', err, resp);
      return next();
    }

    if ( resp.rows.length === 0) {
      return next();
    }

    const user = resp.rows[0].doc;
    return sessionService.getOrMakeSession({
      user: user.login,
      userId: user._id
    }, (err2, response) => {
      if (err2) {
        return next();
      }

      sessionService.fillUserCtx(ctx, response.response, response.doc);
      sessionService.sessionCacheAdd(ctx.user, ctx.userPrivateConfig, ctx.session, ctx.remoteControlSession);
      return next();
    });
  });
}