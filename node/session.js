const d10 = require('./d10');
const debug = d10.debug('d10:session');
const when = require('./when');

let sessionCache = {};

module.exports = {
  init,
  getSessionDataFromCache,
  getSessionDataFromDatabase,
  sessionCacheAdd,
  fillUserCtx,
  removeSession,
  makeSession,
  makeRemoteControlSession,
  getUser
};

function init() {
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
        delete sessionCache[key];
      }
    });
  });

  // cache invalidation
  setInterval(() => { sessionCache = {}; }, 1000 * 60 * 30);
}

function isSessionRelatedDocType(docType) {
  return docType === 'se' || docType === 'pr' || docType === 'us' || docType === 'rs';
}

function sessionCacheAdd(us, pr, se, rs) {
  sessionCache[us.login] = { us, pr, se, rs };
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

function getUser(sessionId, then) {
  for (let i in sessionCache) {
    if (sessionCache[i].se && sessionCache[i].se._id === `se${sessionId}`) {
      return then(null, sessionCache[i].us._id);
    } else if (sessionCache[i].rs && sessionCache[i].rs._id === `rs${sessionId}`) {
      return then(null, sessionCache[i].us._id);
    }
  }

  function searchSession(thenSession) {
    d10.couch.auth.getDoc(`se${sessionId}`, (err, resp) => {
      if (err) {
        return thenSession(err, resp);
      }
      return thenSession(null, `us${resp.userid}`);
    });
  }

  function searchRemoteSession(thenSession) {
    d10.couch.auth.getDoc(`rs${sessionId}`, (err, resp) => {
      if (err) {
        return thenSession(err, resp);
      }
      return thenSession(null, `us${resp.userid}`);
    });
  }

  when({se: searchSession, rs: searchRemoteSession }, (errs, resps) => {
    if (resps.se) {
      return then(null, resps.se);
    } else if (resps.rs) {
      return then(null, resps.rs);
    }
    return then(errs, resps);
  });

  return true;
};

function saveSession(doc, deleteIt) {
  if (deleteIt) {
    d10.couch.auth.deleteDoc(doc, (err) => {
      if (err) {
        debug(`failed to delete session ${doc._id}`);
      } else {
        debug(`session deleted ${doc._id}`);
      }
    });
  } else if (doc._rev) {
    d10.couch.auth.storeDoc(doc, () => {});
  }
  return true;
}

function removeSession(sessionId, cb) {
  d10.couch.auth.deleteDoc(sessionId, cb);
}

function makeSession (uid, cb) {
  return makeSessionForType(uid, 'se', cb);
}

function makeRemoteControlSession (uid, cb) {
  return makeSessionForType(uid, 'rs', cb);
}

function makeSessionForType (uid, type, cb) {
  const sessionId = d10.uid();
  const d = new Date();
  // create session and send cookie
  const doc = {
    _id: `${type}${sessionId}`,
    userid: uid.substr(2),
    ts_creation: d.getTime(),
    ts_last_usage: d.getTime()
  };
  d10.couch.auth.storeDoc(doc, (err) => {
    if (err) {
      return cb(new Error('Session recording error'));
    }
    return cb(null, doc);
  });
}

/*
 * setup ctx.session
 * ctx.user
 * ctx.userPrivateConfig
 */
function fillUserCtx(ctx, response, session) {
  if (session._id.indexOf('se') === 0) {
    ctx.session = session;
  } else {
    ctx.remoteControlSession = session;
  }
  response.rows.forEach((v) => {
    if (v.doc._id.indexOf('se') === 0 && session._id.indexOf('se') === 0 && v.doc._id !== session._id) {
      debug('deleting session ', v.doc._id);
      saveSession(v.doc, true);
    } else if (v.doc._id.indexOf('rs') === 0 && session._id.indexOf('rs') === 0 && v.doc._id !== session._id) {
      debug('deleting session ', v.doc._id);
      saveSession(v.doc, true);
    } else if (v.doc._id.indexOf('us') === 0) {
      ctx.user = v.doc;
    } else if (v.doc._id.indexOf('pr') === 0) {
      ctx.userPrivateConfig = v.doc;
    }
  });
}

