const bodyParser = require('body-parser');
const d10 = require('./d10');
const users = require('./d10.users');
const session = require('./session');

const jsonParserMiddleware = bodyParser.json();
const urlencodedParserMiddleware = bodyParser.urlencoded({ extended: true });
const debug = d10.debug('d10:d10.router.homepage');

exports.homepage = (app) => {
  function display10er10(request, response) {
    const genres = [...d10.config.genres];
    genres.sort();
    const debugOnFrontend = !!(request.query && request.query.debug);

    const vars = {
      scripts: d10.config.javascript.includes,
      dbg: debugOnFrontend ? 'true' : 'false',
      base_url: request.basepath,
      audio_root: d10.config.audio_root,
      img_root: 'audioImages',
      img_size: d10.config.images.defaultSize,
      img_default: d10.config.images.default.join(','),
      rpp: d10.config.rpp,
      genres,
      langs: [],
      invites_ttl: d10.config.invites.ttl,
      cookieName: d10.config.cookieName,
      libraryDefaultTab: d10.config.library.defaultTab,
    };
    if (request.query.o && request.query.o.indexOf('a') >= 0) {
      vars.debugAudio = true;
    }
    if (request.query.o && request.query.o.indexOf('n') >= 0) {
      vars.debugNet = true;
    }
    if (debugOnFrontend) {
      vars.debugloop = true;
    }
    vars.username = request.ctx.user.login;
    const requests = [
      request.ctx.langUtils.parseServerTemplate(request, 'html/results/container.html'),
      request.ctx.langUtils.parseServerTemplate(request, 'html/library/container.html'),
      request.ctx.langUtils.parseServerTemplate(request, 'html/my/container.html'),
      request.ctx.langUtils.parseServerTemplate(request, 'html/upload/container.html'),
      request.ctx.langUtils.parseServerTemplate(request, 'html/welcome/container.html'),
      request.ctx.langUtils.parseServerTemplate(request, 'homepage.html'),
      request.ctx.langUtils.getSupportedLangs(),
    ];

    Promise.all(requests)
      .then(([
        resultsContainer,
        libraryContainer,
        myContainer,
        uploadContainer,
        welcomeContainer,
        homepage,
        langs,
      ]) => {
        Object.keys(langs).forEach((lang) => {
          const langO = { id: lang, label: langs[lang] };
          if (lang === request.ctx.lang) {
            langO.checked = true;
          }
          vars.langs.push(langO);
        });

        response.end(d10.mustache.to_html(homepage, vars, {
          resultsContainer,
          libraryContainer,
          myContainer,
          uploadContainer,
          welcomeContainer,
        }));
      })
      .catch((err) => {
        debug('READ ERROR : ', err);
        response.writeHead(501, request.ctx.headers);
        response.end('Filesystem error');
      });
  }

  function displayHomepage(request, response, next) {
    if (request.ctx.session && '_id' in request.ctx.session && request.ctx.user) {
      debug('homepage router: LOGGED');
    } else {
      debug('homepage router: NOT LOGGED');
    }
    request.ctx.headers['Content-Type'] = 'text/html; charset=utf-8';
    response.writeHead(200, request.ctx.headers);

    if (request.ctx.session && '_id' in request.ctx.session && request.ctx.user) {
      if (request.query.lang) {
        request.ctx.langUtils.langExists(request.query.lang, (exists) => {
          if (exists) {
            request.ctx.user.lang = request.query.lang;
            d10.couch.auth.storeDoc(request.ctx.user, (err, resp) => {
              request.ctx.lang = request.query.lang;
              display10er10(request, response, next);
            });
          } else {
            display10er10(request, response, next);
          }
        });
      } else {
        display10er10(request, response, next);
      }
    } else {
      request.ctx.langUtils.parseServerTemplate(request, 'login.html', (err, html) => {
        response.end(html);
      });
    }
  }
  app.get('/welcome/goodbye', (request, response, next) => {
    d10.couch.auth.deleteDoc(request.ctx.session, () => {});
      delete request.ctx.session;
      delete request.ctx.user;
      delete request.ctx.userPrivateConfig;
    request.ctx.headers['Set-Cookie'] = `${d10.config.cookieName}=no; path=${d10.config.cookiePath}`;
    displayHomepage(request, response, next);
  });

  app.get('/', displayHomepage);
  app.post('/', urlencodedParserMiddleware, (request, response, next) => {
    const checkPass = function () {
      users.checkAuthFromLogin(request.body.username, request.body.password, (err, uid, loginResponse) => {
        if (err || !uid) {
          return displayHomepage(request, response, next);
        }

        debug('POST/: user logged with login/password:', uid);
        session.makeSession(uid, (err, sessionDoc) => {
          if ( !err ) {
            session.fillUserCtx(request.ctx,{ rows: loginResponse },sessionDoc);
            var cookie = { user: request.ctx.user.login, session: sessionDoc._id.substring(2) };
            request.ctx.setCookie(cookie);
            if ( request.ctx.user.lang ) { request.ctx.lang = request.ctx.user.lang; }
          }
          displayHomepage(request,response,next);
        });
      });
    };


    // login try
    if (request.body && request.body.username && request.body.password && request.body.username.length && request.body.password.length) {
      // get uid with login
      debug('got a username & password : try to find uid with username');
      checkPass();
    } else {
      displayHomepage(request, response, next);
    }
  });

  app.post('/api/session', jsonParserMiddleware, (request, response, next) => {
    const checkPass = function () {
      users.checkAuthFromLogin(request.body.username, request.body.password, (err, uid, loginResponse) => {
        if (err) {
          return d10.realrest.err(500, { error: 'login failed', reason: 'server messed up' }, request.ctx);
        }
        if (!uid) {
          return d10.realrest.err(500, { error: 'login failed', reason: 'invalid credentials' }, request.ctx);
        }
        debug('POST /api/session: user logged with login/password: ', uid);
        session.makeSession(uid, (err,sessionDoc) => {
          if ( !err ) {
            session.fillUserCtx(request.ctx,loginResponse,sessionDoc);
            var cookie = { user: request.ctx.user.login, session: sessionDoc._id.substring(2) };
            request.ctx.setCookie(cookie);
            if ( request.ctx.user.lang ) { request.ctx.lang = request.ctx.user.lang; }
            return d10.realrest.err(200,{ok: true},request.ctx);
          } else {
            return d10.realrest.err(500,{error: "login failed",reason: "invalid credentials"},request.ctx);
          }
        });
      });
    };
    // login try
    if (request.body && request.body.username && request.body.password && request.body.username.length && request.body.password.length) {
      // get uid with login
      debug('got a username & password : try to find uid with username');
      checkPass();
    } else {
      return d10.realrest.err(500, { error: 'login failed', reason: 'invalid parameters' }, request.ctx);
    }
  });
};
