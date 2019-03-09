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
const debug = d10.debug('d10:d10.users');

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
    return d10.dbp.authView('infos/all', { key: ['login', login] })
      .then((back) => {
        if (back.rows.length) {
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
* opts.uuid : 5464623423453656
* opts.callback = function(err,resp)
*
*/
function createUser(login, password, opts) {
  const parent = opts.parent && opts.depth ? opts.parent : null;
  const depth = opts.parent && opts.depth ? parseInt(opts.depth, 10) : 1;
  const uuid = opts.uuid ? opts.uuid : d10.uid();


  function sendResponse(err, resp) {
    if (opts.callback) {
      opts.callback(err, resp);
    }
  }

  function createDocuments() {
    const authUserDoc = { _id: `us${uuid}`, login, parent };
    const authPrivDoc = { _id: `pr${uuid}`, password: hash.sha1(password), depth };
    const d10PreferencesDoc = { _id: `up${uuid}` };
    const d10PrivateDoc = { _id: `pr${uuid}` };

    const authQuery = d10.dbp.authStoreDocs([authUserDoc, authPrivDoc]);
    const wiQuery = d10.dbp.d10wiStoreDocs([d10PreferencesDoc, d10PrivateDoc]);

    return Promise.all([authQuery, wiQuery])
      .catch((err) => {
        debug('User documents creation failed', err);
        d10.dbp.authDeleteDoc(authUserDoc._id)
          .catch(derr => debug(`unable to delete doc auth:${authUserDoc._id}`, derr));
        d10.dbp.authDeleteDoc(authPrivDoc._id)
          .catch(derr => debug(`unable to delete doc auth:${authPrivDoc._id}`, derr));
        d10.dbp.d10wiDeleteDoc(d10PreferencesDoc._id)
          .catch(derr => debug(`unable to delete doc d10wi:${d10PreferencesDoc._id}`, derr));
        d10.dbp.d10wiDeleteDoc(d10PrivateDoc._id)
          .catch(derr => debug(`unable to delete doc d10wi:${d10PrivateDoc._id}`, derr));
        throw err;
      });
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
      return createDocuments()
        .then(() => sendResponse(null, uuid));
    })
    .catch(sendResponse);
}

function authFromLoginPass(login, password) {
  if (login.trim().length < 1) {
    return Promise.reject(new Error('Login too short'));
  }

  return d10.db.getAuthDocsFromLogin(login)
    .then((docs) => {
      if (!docs) {
        return null;
      }
      const privateDoc = docs.filter(row => row.doc._id.indexOf('pr') === 0).pop();
      if (!privateDoc) {
        debug(`No private doc for ${login}`, docs);
        return null;
      }
      const passwordSha1 = hash.sha1(password);
      let uid;
      if (privateDoc.doc.password === passwordSha1) {
        uid = privateDoc.doc._id.replace(/^pr/, 'us');
      }

      return { uid, docs };
    });
}

function getListenedSongsByDate(uid, opts, callback) {
  if (opts.startkey && opts.startkey.length && opts.startkey[0] !== uid) {
    // eslint-disable-next-line no-param-reassign
    opts.startkey[0] = uid;
  }

  d10.couch.track.view('tracking/userDateTracking', opts, callback);
}


exports.isValidLogin = isValidLogin;
exports.isValidPassword = isValidPassword;
exports.createUser = createUser;
exports.authFromLoginPass = authFromLoginPass;
exports.getListenedSongsByDate = getListenedSongsByDate;
