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

  if (!req.headers['api-key']) {
    return next();
  }

  const apikey = req.headers['api-key'];

  return setupEnvUsingApikey(req, apikey, next);
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
