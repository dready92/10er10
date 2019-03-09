const bodyParser = require('body-parser');
const fs = require('fs');
const d10 = require('./d10');
const when = require('./when');
const emitter = require('./lib/rc-events');
const users = require('./d10.users');
const session = require('./session');

const jsonParserMiddleware = bodyParser.json();
const urlencodedParserMiddleware = bodyParser.urlencoded({ extended: true });
const debug = d10.debug('d10:d10.router.rc');

function readOneFileOrDir(stats, fileName, completePath, opts) {
  if (stats.isDirectory()) {
    return function rdir(then) {
      readFilesInDir(completePath, opts, then);
    };
  }
  if (!opts.match || opts.match.test(fileName)) {
    return function rfile(then) {
      fs.readFile(completePath, then);
    };
  }

  return null;
}

function lsAndStatDir(dir, callback) {
  fs.readdir(dir, (err, files) => {
    if (err) {
      debug(dir, err);
      return callback(err);
    }
    const jobs = {};
    files.forEach((fileName) => {
      jobs[fileName] = function fstat(then) {
        fs.stat(`${dir}/${fileName}`, then);
      };
    });
    if (!d10.count(jobs)) { debug('no jobs on ', dir); return callback(null, {}); }
    when(jobs, callback);
  });
}

function readFilesInDir(dir, opts, callback) {
  debug('readFilesInDir on ', dir);
  opts = opts || {};

  function allShouldBeRead(readErrs, readResps) {
    if (readErrs) { debug(readErrs); return callback(readErrs); }
    const sortedCompletePath = [];
    for (const completePath in readResps) { sortedCompletePath.push(completePath); }
    sortedCompletePath.sort();

    let allText = '';
    sortedCompletePath.forEach((completePath) => {
      allText += readResps[completePath];
    });
    return callback(null, allText);
  }

  lsAndStatDir(dir, (errs, stats) => {
    if (errs) {
      debug('STAT ERROR : ', errs);
      return callback(errs);
    }
    debug('lsAndStatDir back for ', dir);
    const readJobs = {};
    for (const s in stats) {
      const completePath = `${dir}/${s}`;
      const closure = readOneFileOrDir(stats[s], s, completePath, opts);
      if (closure) {
        readJobs[completePath] = closure;
      }
    }
    if (!d10.count(readJobs)) { debug('no jobs on ', dir); return allShouldBeRead(null, ''); }
    when(readJobs, allShouldBeRead);
  });
}

exports.publicApi = function publicApi(app) {
  app.get('/rc', (request, response) => {
    request.ctx.langUtils.parseServerTemplate(request, 'html/rc/login.html', (err, resp) => {
      if (err) {
        debug(err);
        return response.end('An error occured');
      }
      return response.end(d10.mustache.to_html(resp, {}));
    });
  });
  app.get('/rc/js', (request, response) => {
    const jsPath = `${d10.config.javascript.rootDir}/rc`;
    readFilesInDir(jsPath, { match: /\.js$/ }, (err, text) => {
      if (err) {
        debug(err);
        response.writeHead(500, request.ctx.headers);
        return response.end(err);
      }
      request.ctx.headers['Content-type'] = 'application/javascript';
      response.writeHead(200, request.ctx.headers);
      return response.end(text);
    });
  });
  app.get('/rc/js/config.js', (_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/javascript' });
    response.end(`define([], function() { return ${JSON.stringify(
      {
        site_url: '',
        base_url: '/',
        img_default: d10.config.images.default,
        img_root: '../audioImages',
        cookieName: d10.config.cookieName,
      },
    )}});`);
  });

  app.put('/api/rc/logout', (request) => {
    debug('PUT /api/rc/logout');
    if (!request.ctx.user || !request.ctx.remoteControlSession) {
      return d10.realrest.err(404, { error: 'session not found' }, request.ctx);
    }
    const cookie = { user: '', remoteControlSession: '' };
    request.ctx.setCookie(cookie);
    const id = {
      user: request.ctx.user._id,
      session: request.ctx.remoteControlSession._id,
    };
    return session.removeSession(id.session, () => {
      emitter.emit('logout', id);
      d10.realrest.success({ logout: true }, request.ctx);
    });
  });

  app.post('/api/rc/login', jsonParserMiddleware, urlencodedParserMiddleware, (request) => {
    debug('POST /api/rc/login begin');
    if (request.body.login && request.body.password) {
      debug(`POST /api/rc/login: try to auth user [${request.body.login}]`);

      users.authFromLoginPass(request.body.login, request.body.password)
        .then((loginResponse) => {
          if (!loginResponse) {
            return sessionErrorResponse(null, request.ctx);
          }
          debug(`POST /api/rc/login: user [${request.body.login}] logged with login/password: `, loginResponse.uid);
          return session.makeRemoteControlSession(loginResponse.uid, (err, sessionDoc) => {
            if (!err) {
              session.fillUserCtx(request.ctx, { rows: loginResponse.docs }, sessionDoc);
              const cookie = {
                user: request.ctx.user.login,
                remoteControlSession: sessionDoc._id.substring(2),
              };
              request.ctx.setCookie(cookie);
              if (request.ctx.user.lang) { request.ctx.lang = request.ctx.user.lang; }
              return sessionSuccessResponse(sessionDoc._id, request.ctx);
            }
            return sessionErrorResponse(err, request.ctx);
          });
        });

      return null;
    }
    debug('POST /api/rc/login: no user/pass provided, lookup current session');
    if (request.ctx.remoteControlSession && request.ctx.remoteControlSession._id
          && request.ctx.remoteControlSession._id.substr(0, 2) === 'rs') {
      debug('Successfully logged from current session');
      return sessionSuccessResponse(request.ctx.session._id, request.ctx);
    }
    debug('POST /api/rc/login: no current session');
    return sessionErrorResponse('Nothing to log in', request.ctx);
  });
};

function sessionSuccessResponse(sessionId, ctx) {
  d10.realrest.success({ login: true, session: sessionId }, ctx);
}

function sessionErrorResponse(err, ctx) {
  d10.realrest.err(401, { login: false }, ctx);
}

exports.api = function () {
};
