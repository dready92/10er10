const d10 = require('./d10');
const when = require('./when');

let sessionCache = {};

module.exports = {
  init,
  getSessionDataFromCache,
  getSessionDataFromDatabase,
  sessionCacheAdd,
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