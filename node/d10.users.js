const d10 = require('./d10');
const hash = require('./hash');

const PASSWORD_MIN_DISTINCT_CHARS = 4;
const PASSWORD_MIN_LENGTH = 8;
const errCodes = {
  430: 'Login already registered',
  431: 'Login too short',
  432: 'Login contains invalid characters',
  440: 'Password does not contain enough characters',
  441: 'Password does not contain enough different characters',
};

function isValidLogin(login) {
  return new Promise((resolve) => {
    if (login.length < 3) { return resolve(431); }
    if (
      login.indexOf('<') >= 0
      || login.indexOf('>') >= 0
      || login.indexOf('/') >= 0
      || login.indexOf('\\') >= 0
      || login.indexOf('"') >= 0
      || login.indexOf("'") >= 0
      || login.indexOf('&') >= 0
    ) return resolve(432);
    if (login.toLowerCase() === 'admin'
      || login.toLowerCase() === 'administrateur'
      || login.toLowerCase() === 'administrator'
      || login.toLowerCase() === 'root'
    ) return resolve(430);

    return d10.mcol(d10.COLLECTIONS.USERS).findOne({ login })
      .then((back) => {
        if (back) {
          return resolve(430);
        }
        return resolve();
      })
      .catch(() => resolve(503));
  });
}


function isValidPassword(password) {
  return new Promise((resolve) => {
    if (password.length < PASSWORD_MIN_LENGTH) {
      return resolve(440);
    }
    const pwdhash = new Set();
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < password.length; i++) {
      pwdhash.add(password.charCodeAt(i));
    }
    if (pwdhash.size < PASSWORD_MIN_DISTINCT_CHARS) {
      return resolve(441);
    }
    return resolve();
  });
}


/**
* opts.parent: "us123445547754"
* opts.depth : 4
*
* opts.callback = function(err,resp)
*
*/
function createUser(login, password, opts) {
  const parent = opts.parent && opts.depth ? opts.parent : null;
  const depth = opts.parent && opts.depth ? parseInt(opts.depth, 10) : 1;

  function sendResponse(err, resp) {
    if (opts.callback) {
      opts.callback(err, resp);
    }
  }

  Promise.all([isValidLogin(login), isValidPassword(password)])
    .then(([loginResponse, passwordResponse]) => {
      const errs = {};
      if (loginResponse) {
        errs.login = errCodes[loginResponse];
      }
      if (passwordResponse) {
        errs.password = errCodes[passwordResponse];
      }
      if (loginResponse || passwordResponse) {
        return sendResponse(errs);
      }
      const userDoc = mkUserDoc(login, password, depth, parent);
      return d10.mcol(d10.COLLECTIONS.USERS).insertOne(userDoc)
        .then(() => sendResponse(null, userDoc._id));
    })
    .catch(sendResponse);
}

function authFromLoginPass(login, password) {
  if (login.trim().length < 1) {
    return Promise.reject(new Error('Login too short'));
  }

  const passwordSha1 = hash.sha1(password);

  return d10.mcol(d10.COLLECTIONS.USERS).findOne({ login, password: passwordSha1 });
}

function getListenedSongsByDate(uid, opts, callback) {
  if (opts.startkey && opts.startkey.length && opts.startkey[0] !== uid) {
    // eslint-disable-next-line no-param-reassign
    opts.startkey[0] = uid;
  }

  const cursor = d10.mcol(d10.COLLECTIONS.EVENTS).find({ user: uid, fullplay: true }).sort({ 'play.time': -1 }).limit(opts.limit);
  if (opts.skip) {
    cursor.skip(opts.skip);
  }
  cursor.then(response => callback(null, response))
    .catch(err => callback(err));
}

function mkUserDoc(login, password, depth, parent) {
  const userDoc = {
    _id: `us${d10.uid()}`,
    depth,
    parent,
    login,
    password: hash.sha1(password),
    apikeys: [],
    playlists: [],
    sessions: [],
    preferences: {},
  };

  return userDoc;
}

module.exports = {
  isValidLogin,
  isValidPassword,
  createUser,
  authFromLoginPass,
  getListenedSongsByDate,
  mkUserDoc,
};
