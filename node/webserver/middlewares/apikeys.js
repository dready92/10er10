const pause = require('pause');

const d10 = require('../../d10');

const sessionService = require('../../session');

module.exports = {
  loginUsingHeader,
  loginUsingPath,
};

function loginUsingHeader(req, res, next) {
  if (req && req.ctx && req.ctx.hasSession()) {
    return next();
  }

  let apiKey = parseApiKeyHeader(req.headers);
  if (!apiKey) {
    apiKey = parseAuthorizationBearerHeader(req.headers);
  }
  if (!apiKey) {
    return next();
  }

  return setupEnvUsingApikey(req, apiKey, next);
}

function parseApiKeyHeader(headers) {
  if (headers['api-key']) {
    return headers['api-key'];
  }

  return null;
}

function parseAuthorizationBearerHeader(headers) {
  const bearerString = 'bearer ';
  const authorization = headers.authorization;
  if (authorization
    && authorization.length > bearerString.length
    && authorization.toLowerCase().startsWith(bearerString)) {
    return authorization.substr(0, bearerString.length);
  }

  return null;
}

function loginUsingPath(req, res, next) {
  const regmatch = req.url.split('/');
  if (regmatch.length < 4) {
    return next();
  }
  if (regmatch[1] !== 'apikeys') {
    return next();
  }

  const apikey = regmatch[2];

  return setupEnvUsingApikey(req, apikey, (success) => {
    if (success) {
      regmatch.splice(0, 3);
      req.url = `/${regmatch.join('/')}`;
    }
    next();
  });
}

function setupEnvUsingApikey(req, apikey, next) {
  // eslint-disable-next-line prefer-destructuring
  const ctx = req.ctx;

  const handle = pause(req);

  function nextWrapper(arg) {
    handle.end();
    next(arg);
    handle.resume();
  }

  d10.mcol(d10.COLLECTIONS.USERS).findOne({ 'apikeys.key': apikey })
    .then((userDoc) => {
      if (!userDoc) {
        return nextWrapper();
      }

      return sessionService.getOrMakeSession({
        user: userDoc.login,
        userId: userDoc._id,
      })
        .then((userSession) => {
          sessionService.fillUserCtx(ctx, userDoc, userSession);
          return nextWrapper(true);
        })
        .catch(() => nextWrapper());
    })
    .catch(() => nextWrapper());
}
