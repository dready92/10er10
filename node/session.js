/* eslint-disable object-curly-newline */
/* eslint-disable no-plusplus */
const d10 = require('./d10');

const debug = d10.debug('d10:session');

module.exports = {
  getSessionDataFromDatabase,
  fillUserCtx,
  removeSession,
  makeSession,
  makeRemoteControlSession,
  getOrMakeSession,
  setSessionLang,
  getUser,
  setSessionTimestamp,
};

/**
 *
 * @param {Object} of - The data to help lookup the session
 * @param {String} of.user - The user login
 * @param {String} of.userId - The user login id (with prepent 'us')
 * @param {String} [of.session] - The session id (without 'se')
 * @param {String} [of.remoteControlSession] - The remote control session id (without 'rs')
 */
function getOrMakeSession(of) {
  function filter(doc) {
    return doc._id.substr(0, 2) === 'se';
  }

  return getSession(of.user, filter)
    .then((sessionResponse) => {
      if (sessionResponse) {
        return sessionResponse;
      }

      return makeSession(of.userId)
        .then(getOrMakeSession);
    });
}

/**
 * Get the first session answering to criteria evaluated in the filter function
 *
 *
 * @param {string} userLogin - user's login
 * @param {Function} filter - the filter function, that should return true when the session object matches
 */
function getSession(userLogin, filter) {
  return getLoginInfos(userLogin)
    .then((userDoc) => {
      if (!userDoc) {
        return null;
      }
      const okfilter = userDoc.sessions.filter(filter);
      if (okfilter.length) {
        return okfilter[0];
      }
      return null;
    });
}

function getLoginInfos(userLogin) {
  return d10.mcol(d10.COLLECTIONS.USERS).findOne({ login: userLogin });
}

/**
 *
 * @param {Object} of - The data to help lookup the session
 * @param {String} of.user - The user login
 * @param {String} [of.session] - The session id (without 'se')
 * @param {String} [of.remoteControlSession] - The remote control session id (without 'rs')
 * @param {Function} then - asynchronous callback
 */
function getSessionDataFromDatabase(of) {
  function sessionMatch(row) {
    return ((of.session && row._id === `se${of.session}`)
              || (of.remoteControlSession && row._id === `rs${of.remoteControlSession}`));
  }

  return getSession(of.user, sessionMatch);
}

function getUser(sessionId, then) {
  debug(`looking up session ${sessionId}`);
  function searchSession() {
    return d10.mcol(d10.COLLECTIONS.USERS).findOne({ 'sessions._id': `se${sessionId}` })
      .then(doc => doc && doc._id);
  }

  function searchRemoteSession() {
    return d10.mcol(d10.COLLECTIONS.USERS).findOne({ 'sessions._id': `rs${sessionId}` })
      .then(doc => doc && doc._id);
  }

  Promise.all([searchSession(), searchRemoteSession()])
    .then(([se, rs]) => {
      if (se) {
        return then(null, se);
      }
      if (rs) {
        return then(null, rs);
      }
      return then();
    })
    .catch(err => then(err));

  return true;
}

function removeSession(sessionId, cb) {
  return d10.mcol(d10.COLLECTIONS.USERS).updateOne(
    { 'sessions._id': sessionId },
    { $pull: { sessions: { _id: sessionId } } },
  )
}

function makeSession(userDoc) {
  return makeSessionForType(userDoc, 'se');
}

function makeRemoteControlSession(userDoc) {
  return makeSessionForType(userDoc, 'rs');
}

function makeSessionForType(userDoc, type) {
  const sessionId = d10.uid();
  const d = new Date();
  // create session and record it in user doc
  const doc = {
    _id: `${type}${sessionId}`,
    ts_creation: d.getTime(),
    ts_last_usage: d.getTime(),
  };
  return d10.mcol(d10.COLLECTIONS.USERS)
    .updateOne({ _id: userDoc._id }, { $push: { sessions: doc } })
    .then(() => doc);
}

/*
 * setup ctx.session
 * ctx.user
 * ctx.userPrivateConfig
 */
function fillUserCtx(ctx, userDoc, userSession) {
  if (userSession._id.indexOf('se') === 0) {
    ctx.session = userSession;
  } else {
    ctx.remoteControlSession = userSession;
  }
  ctx.user = { ...userDoc };
  delete ctx.user.sessions;
  ctx.userPrivateConfig = {
    depth: ctx.user.depth,
    parent: ctx.user.parent,
    password: ctx.user.password,
  };
  delete ctx.user.password;
  delete ctx.user.parent;
  delete ctx.user.depth;
}

function setSessionLang(sessionId, lang) {
  return d10.mcol(d10.COLLECTIONS.USERS).updateOne(
    { 'sessions._id': sessionId },
    { $set: { 'sessions.$.lang': lang } },
  );
}

function setSessionTimestamp(sessionId, timestamp) {
  return d10.mcol(d10.COLLECTIONS.USERS).updateOne(
    { 'sessions._id': sessionId },
    { $set: { 'sessions.$.ts_last_usage': timestamp } },
  );
}
