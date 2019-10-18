// eslint-disable-next-line no-unused-vars,prefer-destructuring
const Collection = require('mongodb').Collection;

process.env.MAGIC = process.env.MAGIC || `${__dirname}/magic/magic.mgc`;

const mmmagic = require('mmmagic');
const debugProvider = require('./debug');
const mustache = require('./mustache');
const mongoclient = require('./db/mongo');
const mongocheck = require('./db/check-base');

const { Magic } = mmmagic;
const MONGO_COLLECTIONS = {
  SONGS: 'songs',
  USER_HISTORY: 'userhistory',
  USERS: 'users',
  PINGS: 'pings',
  EVENTS: 'events',
  ARTISTS: 'artists',
  ALBUMS: 'albums',
  SONGS_STAGING: 'songsstaging',
  INVITES: 'invites',
};

let config;

const debug = debugProvider('d10:d10');

function setConfig(cfg) {
  module.exports.config = cfg;
  config = cfg;
  return setMongoConfig(cfg);
}

function setMongoConfig(cfg) {
  const mongoDebug = debugProvider('d10:mongodb');
  if (module.exports.mongoClient) {
    module.exports.mongoClient.close()
      .catch(err => debug('error in mongodb client close()', err));
  }

  return mongoclient(cfg.mongo.url, cfg.mongo.options)
    .then((client) => {
      module.exports.mongoClient = client;

      const db = client.db(cfg.mongo.database);
      db.on('error', err => mongoDebug('error', err));
      db.on('timeout', () => mongoDebug('timeout'));
      db.on('reconnect', () => mongoDebug('reconnect'));
      module.exports.mongo = db;

      return mongocheck(db);
    })
    .catch((err) => {
      debug('unable to connect to MongoDb ', err);
      process.exit(1);
    });
}

/**
 * @param {String} id name of the collection to return
 *
 * @returns {Collection} a Mongo client collection instance
 */
function mcol(id) {
  return module.exports.mongo.collection(id);
}

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

function uid() {
  return (
    `${(0x100000000 * Math.random()).toString(32)}${
      (0x100000000 * Math.random()).toString(32)}${
      (0x100000000 * Math.random()).toString(32)}`
  ).replace(/\./g, '');
}

function count(obj) {
  return Object.keys(obj).length;
}

function statusMessage(code) {
  if (code in httpStatusCodes) {
    return httpStatusCodes[code];
  }
  return 'Generic error';
}

function lngView(request, n, d, p) {
  return new Promise((resolve, reject) => {
    if (n.match(/^inline\//)) {
      return inlineView(request, n, d, p, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    }

    return request.ctx.langUtils.parseServerTemplate(request, `${n}.html`)
      .then(data => mustache.to_html(data, d, p));
  });

}

function inlineView(request, n, d, p, cb) {
  request.ctx.langUtils.loadLang(request.ctx.lang, 'server', (err, resp) => {
    if (err) { return cb(err); }
    return cb(null, resp.inline[n.replace('inline/', '')]);
  });
}

function ucwords(str) {
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
}

function fileType(file, cb) {
  const magic = new Magic(mmmagic.MAGIC_MIME_TYPE);
  magic.detectFile(file, (err, result) => {
    debug('fileType : ', result);
    debug('fileType error ?', err);
    cb(err, result);
  });
}

const realrest = {
  err(code, data, ctx) {
    if (!ctx) {
      // eslint-disable-next-line no-param-reassign
      ctx = data;
      // eslint-disable-next-line no-param-reassign
      data = null;
    }
    debug('response : ', code, statusMessage(code), ctx.headers, data);
    ctx.headers['Content-Type'] = 'application/json';
    ctx.response.writeHead(code, statusMessage(code), ctx.headers);
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

function orderedList(ids, items) {
  const itemsHash = {};
  items.forEach((item) => { itemsHash[item._id] = item; });
  return ids.map(id => itemsHash[id]).filter(doc => doc);
}

module.exports = {
  debug: debugProvider,
  mustache,
  setConfig,
  uid,
  count,
  lngView,
  inlineView,
  ucwords,
  fileType,
  realrest,
  http: {
    statusMessage,
  },
  mcol,
  COLLECTIONS: MONGO_COLLECTIONS,
  orderedList,
};
