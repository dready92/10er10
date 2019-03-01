process.env.MAGIC = process.env.MAGIC || `${__dirname}/magic/magic.mgc`;

const debugModule = require('debug');
const ncouch = require('ncouch');
const mmmagic = require('mmmagic');
const files = require('./files');

const { Magic } = mmmagic;

let config;
let fileCache;

function toPromise(fn, context) {
  return (...args) => new Promise((resolve, reject) => {
    args.push((err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
    fn.apply(context, args);
  });
}

function makePromisesDb(couch) {
  const db = {};
  db.trackGetAllDocs = toPromise(couch.track.getAllDocs, couch.track);
  db.trackGetDoc = toPromise(couch.track.getDoc, couch.track);
  db.trackStoreDoc = toPromise(couch.track.storeDoc, couch.track);
  db.trackStoreDocs = toPromise(couch.track.storeDocs, couch.track);
  db.trackView = toPromise(couch.track.view, couch.track);
  db.trackUpdateDoc = toPromise(couch.track.updateDoc, couch.track);
  db.d10GetAllDocs = toPromise(couch.d10.getAllDocs, couch.d10);
  db.d10GetDoc = toPromise(couch.d10.getDoc, couch.d10);
  db.d10StoreDoc = toPromise(couch.d10.storeDoc, couch.d10);
  db.d10StoreDocs = toPromise(couch.d10.storeDocs, couch.d10);
  db.d10View = toPromise(couch.d10.view, couch.d10);
  db.d10List = toPromise(couch.d10.list, couch.d10);
  db.d10UpdateDoc = toPromise(couch.d10.updateDoc, couch.d10);
  db.d10wiGetAllDocs = toPromise(couch.d10wi.getAllDocs, couch.d10wi);
  db.d10wiGetDoc = toPromise(couch.d10wi.getDoc, couch.d10wi);
  db.d10wiStoreDoc = toPromise(couch.d10wi.storeDoc, couch.d10wi);
  db.d10wiStoreDocs = toPromise(couch.d10wi.storeDocs, couch.d10wi);
  db.d10wiView = toPromise(couch.d10wi.view, couch.d10wi);
  db.d10wiUpdateDoc = toPromise(couch.d10wi.updateDoc, couch.d10wi);
  db.authGetAllDocs = toPromise(couch.auth.getAllDocs, couch.auth);
  db.authGetDoc = toPromise(couch.auth.getDoc, couch.auth);
  db.authStoreDoc = toPromise(couch.auth.storeDoc, couch.auth);
  db.authStoreDocs = toPromise(couch.auth.storeDocs, couch.auth);
  db.authView = toPromise(couch.auth.view, couch.auth);
  db.authUpdateDoc = toPromise(couch.auth.updateDoc, couch.auth);

  return db;
}

exports.debug = function debugProvider(identifier) {
  const dbg = debugModule(identifier);
  return (...args) => {
    let str = '';
    args.forEach((arg) => {
      if (arg && typeof arg === 'object') {
        if (arg.stack) {
          str += arg.stack;
        } else {
          str += JSON.stringify(arg);
        }
      } else {
        str += arg;
      }
    });
    dbg(str);
  };
};

const debug = exports.debug('d10:d10');
exports.mustache = require('./mustache');

exports.setConfig = function setConfig(cfg) {
  exports.config = cfg;
  config = cfg;
  fileCache = files.fileCache(config.production ? null : { bypass: true });
  exports.couch = {
    d10: ncouch.server(config.couch.d10.dsn).debug(false).database(config.couch.d10.database),
    auth: ncouch.server(config.couch.auth.dsn).debug(false).database(config.couch.auth.database),
    track: ncouch.server(config.couch.track.dsn).debug(false).database(config.couch.track.database),
    d10wi: ncouch.server(config.couch.d10wi.dsn).debug(false).database(config.couch.d10wi.database),
  };
  exports.dbp = makePromisesDb(exports.couch);
};

exports.db = {};

exports.db.loginInfos = function loginInfos(login, cb, ecb) {
  exports.dbp.authView('infos/all', { include_docs: true, key: ['login', login] })
    .then((resp) => {
      if (!resp.rows) {
        ecb(null, resp);
        return null;
      }
      return resp.rows[0].doc._id.replace(/^us/, '');
    })
    .then((id) => {
      if (!id) {
        return null;
      }
      return exports.dbp.authView('infos/all', { include_docs: true, startkey: [id, ''], endkey: [id, []] });
    })
    .then((resp) => {
      if (resp) {
        cb(resp);
      }
      return null;
    })
    .catch(err => ecb(err));
};

exports.db.d10Infos = function d10Infos(login, cb, ecb) {
  exports.couch.d10.view('user/all_infos', { include_docs: true, startkey: [login, null], endkey: [login, []] }, (err, resp) => {
    if (err) {
      if (ecb) ecb(err, resp);
    } else if (cb) cb(resp);
  });
};

const httpStatusCodes = {
  100: 'Continue',
  101: 'Switching Protocols',
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Request Entity Too Large',
  414: 'Request-URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Requested Range Not Satisfiable',
  417: 'Expectation Failed',
  420: 'bad file type',
  421: 'file transfer failed',
  422: 'mp3 conversion failed',
  423: 'database transaction failed',
  424: 'invalid song',
  425: 'validation failed',
  426: 'data missing in database',
  427: 'invalid REST query',
  428: 'unknown genre',
  429: 'unknown artist',
  430: 'playlist already exists',
  431: 'not allowed',
  432: 'Can\'t write file to disk',
  433: 'File already in database',
  434: 'Invalid email address',
  435: 'Unable to send email',
  436: 'Unable to get song length',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
};

exports.uid = function uid() {
  return (
    `${(0x100000000 * Math.random()).toString(32)}${
      (0x100000000 * Math.random()).toString(32)}${
      (0x100000000 * Math.random()).toString(32)}`
  ).replace(/\./g, '');
};

exports.count = function count(obj) {
  return Object.keys(obj).length;
};
exports.http = {};
exports.http.statusMessage = function statusMessage(code) {
  if (code in httpStatusCodes) {
    return httpStatusCodes[code];
  }
  return 'Generic error';
};

exports.view = function view(n, d, p, cb) {
  debug('view');
  debug(d, p);
  if (!cb && p) {
    // eslint-disable-next-line no-param-reassign
    cb = p;
    // eslint-disable-next-line no-param-reassign
    p = null;
  }

  fileCache.readFile(`${config.templates.node + n}.html`, 'utf-8', (err, data) => {
    if (err) throw err;
    // eslint-disable-next-line no-param-reassign
    data = exports.mustache.to_html(data, d, p);
    if (cb) cb.call(data, data);
  });
};

exports.lngView = function lngView(request, n, d, p, cb) {
  if (!cb && p) {
    // eslint-disable-next-line no-param-reassign
    cb = p;
    // eslint-disable-next-line no-param-reassign
    p = null;
  }

  if (n.match(/^inline\//)) {
    return inlineView(request, n, d, p, cb);
  }

  return request.ctx.langUtils.parseServerTemplate(request, `${n}.html`, (err, data) => {
    if (err) throw err;
    // eslint-disable-next-line no-param-reassign
    data = exports.mustache.to_html(data, d, p);
    if (cb) cb.call(data, data);
  });
};

const inlineView = function inlineView(request, n, d, p, cb) {
  request.ctx.langUtils.loadLang(request.ctx.lang, 'server', (err, resp) => {
    if (err) { return cb(err); }
    return cb(null, resp.inline[n.replace('inline/', '')]);
  });
};
/*
var icuCollation = [
    " ", "`" , "^", "_", "-", ",", ";", ":", "!", "?", "." ,"'", "\"", "(", ")", "[", "]", "{", "}",
    "@", "*", "/", "\\", "&", "#", "%", "+", "<", "=", ">", "|", "~", "$", "0", "1", "2", "3", "4",
    "5", "6", "7", "8", "9",
    "a", "A", "b", "B", "c", "C", "d", "D", "e", "E", "f", "F", "g", "G", "h", "H", "i", "I", "j",
    "J", "k", "K", "l", "L",
    "m", "M", "n", "N", "o", "O", "p", "P", "q", "Q", "r", "R", "s", "S", "t", "T", "u", "U", "v",
    "V", "w", "W", "x", "X",
    "y", "Y", "z", "Z", "ZZZZZZZZ"
];
*/
const icuCollation = [
  ' ', '`', '^', '_', '-', ',', ';', ':', '!', '?', '.', "'", '"', '(', ')', '[', ']', '{', '}',
  '@', '*', '/', '\\', '&', '#', '%', '+', '<', '=', '>', '|', '~', '$', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
  'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
  'y', 'z', 'ZZZZZZZZ',
];


const nextLetterJS = function nextLetterJS(l) {
  return String.fromCharCode((l.charCodeAt(0) + 1));
};

exports.nextWord = function nextWord(w) {
  const l = w[ (w.length - 1) ];
  const index = icuCollation.indexOf(l.toLowerCase());


  const next = (index > -1 && index + 1 < icuCollation.length)
    ? icuCollation[ (index + 1) ]
    : nextLetterJS(l);
  return w.substring(0, w.length - 1) + next;
};

exports.ucwords = function ucwords(str) {
  // originally from :
  // discuss at: http://phpjs.org/functions/ucwords    // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
  // +   improved by: Waldo Malqui Silva
  // +   bugfixed by: Onno Marsman
  // +   improved by: Robin
  // +      input by: James (http://www.james-bell.co.uk/)    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // *     example 1: ucwords('kevin van  zonneveld');
  // *     returns 1: 'Kevin Van  Zonneveld'
  // *     example 2: ucwords('HELLO WORLD');
  // *     returns 2: 'HELLO WORLD'
  // eslint-disable-next-line no-useless-escape
  return (`${str}`).replace(/^([a-z])|[\s\[\(\.0-9-]+([a-z])/g, $1 => $1.toUpperCase());
};

exports.fileType = function fileType(file, cb) {
  const magic = new Magic(mmmagic.MAGIC_MIME_TYPE);
  magic.detectFile(file, (err, result) => {
    debug('fileType : ', result);
    debug('fileType error ?', err);
    cb(err, result);
  });
};

exports.sanitize = {
  string(s) {
    return exports.ucwords(s.replace(/^\s+/, '').replace(/\s+$/, '').replace(/</g, '').replace(/>/g, '')
      .toLowerCase());
  },
  number(s) {
    // eslint-disable-next-line no-param-reassign
    s = parseFloat(s);
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(s)) return 0;
    return s;
  },
  genre(s) {
    // eslint-disable-next-line no-param-reassign
    s = s.toLowerCase();
    let back = '';
    config.genres.forEach((v) => {
      if (s === v.toLowerCase()) {
        back = v;
      }
    });
    return back;
  },
};

exports.valid = {
  title(s) { return (s.length); },
  artist(s) { return (s.length); },
  genre(s) { return (config.genres.indexOf(s) >= 0); },
  id(s) { return s.substr(0, 2) === 'aa'; },
};

exports.rest = {
  err(code, data, ctx) {
    if (!ctx) {
      // eslint-disable-next-line no-param-reassign
      ctx = data;
      // eslint-disable-next-line no-param-reassign
      data = null;
    }
    const back = {
      status: 'error',
      data: {
        code,
        message: exports.http.statusMessage(code),
      },
    };
    if (data) {
      back.data.infos = data;
    }
    ctx.headers['Content-Type'] = 'application/json';
    ctx.response.writeHead(200, ctx.headers);
    ctx.response.end(
      JSON.stringify(back),
    );
  },
  success(data, ctx) {
    const back = {
      status: 'success',
      data,
    };
    ctx.headers['Content-Type'] = 'application/json';
    ctx.response.writeHead(200, ctx.headers);
    ctx.response.end(
      JSON.stringify(back),
    );
  },
};

exports.realrest = {
  err(code, data, ctx) {
    if (!ctx) {
      // eslint-disable-next-line no-param-reassign
      ctx = data;
      // eslint-disable-next-line no-param-reassign
      data = null;
    }
    debug('response : ', code, exports.http.statusMessage(code), ctx.headers, data);
    ctx.headers['Content-Type'] = 'application/json';
    ctx.response.writeHead(code, exports.http.statusMessage(code), ctx.headers);
    ctx.response.end(data ? JSON.stringify(data) : null);
  },
  success(data, ctx) {
    ctx.headers['Content-Type'] = 'application/json';
    if (data) {
      // eslint-disable-next-line no-param-reassign
      data = JSON.stringify(data);
      ctx.headers['Content-Length'] = Buffer.byteLength(data);
    }
    ctx.response.writeHead(200, ctx.headers);
    ctx.response.end(data);
  },

};

exports.saveUser = function saveUser(doc, deleteIt) {
  if (deleteIt) {
    exports.couch.auth.deleteDoc(doc, (err) => {
      if (err) {
        debug(`failed to delete user ${doc._id}`);
      } else {
        debug(`user deleted ${doc._id}`);
      }
    });
  }
};

exports.saveUserPrivate = function saveUserPrivate(doc, deleteIt) {
  if (deleteIt) {
    exports.couch.auth.deleteDoc(doc, (err) => {
      if (err) {
        debug(`failed to delete user private infos ${doc._id}`);
      } else {
        debug(`user private infos deleted ${doc._id}`);
      }
    });
  }
};
