/* eslint-disable object-curly-newline */
/* eslint-disable no-plusplus */
const d10 = require('./d10');

const debug = d10.debug('d10:session');

module.exports = {
  init,
  getSessionDataFromDatabase,
  fillUserCtx,
  removeSession,
  makeSession,
  makeRemoteControlSession,
  getOrMakeSession,
  getUser,
};

function init() {
}

/**
 *
 * @param {Object} of - The data to help lookup the session
 * @param {String} of.user - The user login
 * @param {String} of.userId - The user login id (with prepent 'us')
 * @param {String} [of.session] - The session id (without 'se')
 * @param {String} [of.remoteControlSession] - The remote control session id (without 'rs')
 * @param {Function} then - asynchronous callback
 */
function getOrMakeSession(of, then) {
  function filter(row) {
    return row.doc._id.substr(0, 2) === 'se';
  }

  getSession(of.user, filter, (err, sessionResponse) => {
    if (err) {
      return then(err);
    }

    if (sessionResponse) {
      return then(null, sessionResponse);
    }

    return makeSession(of.userId, (err2) => {
      if (err2) {
        return then(err2);
      }

      return getOrMakeSession(of, then);
    });
  });
}

/**
 * Get the first session answering to criteria evaluated in the filter function
 *
 *
 * @param {string} userLogin - user's login
 * @param {Function} filter - the filter function, that should return true when the session object matches
 * @param {Function} then - callback {response: the whole CouchDB datastore response, doc: the session doc matching the criteria}
 */
function getSession(userLogin, filter, then) {
  d10.db.loginInfos(userLogin, (response) => {
    let found = false;
    response.rows.forEach((v) => {
      if (!found && filter(v)) {
        found = { response, doc: v.doc };
      }
    });
    return then(null, found);
  }, then);
}

/**
 *
 * @param {Object} of - The data to help lookup the session
 * @param {String} of.user - The user login
 * @param {String} [of.session] - The session id (without 'se')
 * @param {String} [of.remoteControlSession] - The remote control session id (without 'rs')
 * @param {Function} then - asynchronous callback
 */
function getSessionDataFromDatabase(of, then) {
  function sessionMatch(row) {
    return ((of.session && row.doc._id === `se${of.session}`)
              || (of.remoteControlSession && row.doc._id === `rs${of.remoteControlSession}`));
  }

  getSession(of.user, sessionMatch, then);
}

function getUser(sessionId, then) {
  function searchSession() {
    return d10.dbp.authGetDoc(`se${sessionId}`)
      .then(doc => `us${doc.userid}`);
  }

  function searchRemoteSession() {
    return d10.dbp.authGetDoc(`rs${sessionId}`)
      .then(doc => `us${doc.userid}`);
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
  d10.couch.auth.deleteDoc(sessionId, cb);
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
