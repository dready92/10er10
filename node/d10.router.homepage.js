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
        request.ctx.headers['Content-Type'] = 'text/html; charset=utf-8';
        response.writeHead(200, request.ctx.headers);
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
    const logged = request.ctx.session && '_id' in request.ctx.session && request.ctx.user;
    if (logged) {
      debug('homepage router: LOGGED');
    } else {
      debug('homepage router: NOT LOGGED');
    }

    if (logged) {
      if (request.query.lang) {
        request.ctx.langUtils.langExists(request.query.lang, (exists) => {
          if (exists) {
            d10.mcol(d10.COLLECTIONS.USERS).updateOne({ _id: request.ctx.user._id }, { $set: { lang: request.query.lang } })
              .then(() => {
                request.ctx.lang = request.query.lang;
                display10er10(request, response, next);
              })
              .catch(err => d10.realrest.err(500, err, request.ctx));
          } else {
            display10er10(request, response, next);
          }
        });
      } else {
        display10er10(request, response, next);
      }
    } else {
      request.ctx.langUtils.parseServerTemplate(request, 'login.html', (err, html) => {
        request.ctx.headers['Content-Type'] = 'text/html; charset=utf-8';
        response.writeHead(200, request.ctx.headers);
        response.end(html);
      });
    }
  }

  app.get('/welcome/goodbye', (request, response, next) => {
    session.removeSession(request.ctx.session._id)
      .catch((err) => {
        debug('Error when deleting session', err);
      })
      .then(() => {
        delete request.ctx.session;
        delete request.ctx.user;
        delete request.ctx.userPrivateConfig;
        request.ctx.headers['Set-Cookie'] = `${d10.config.cookieName}=no; path=${d10.config.cookiePath}`;
        displayHomepage(request, response, next);
      });
  });

  app.get('/', displayHomepage);
  app.post('/', urlencodedParserMiddleware, (request, response, next) => {
    // login try
    if (request.body && request.body.username && request.body.password
      && request.body.username.length && request.body.password.length) {
      // get uid with login
      debug('got a username & password : try to find uid with username');
      checkPass();
    } else {
      displayHomepage(request, response, next);
    }

    function checkPass() {
      users.authFromLoginPass(request.body.username, request.body.password)
        .then((userDoc) => {
          if (!userDoc) {
            debug('POST/: bad loggin or password');
            return;
          }
          debug('POST/: user logged with login/password:', userDoc._id);
          return setSessionAndLang(request.ctx, userDoc)
            .catch(() => {
              debug('ignoring session error');
            });
        })
        .then(() => displayHomepage(request, response, next));
    }
  });

  app.post('/api/session', jsonParserMiddleware, (request) => {
    // login try
    if (request.body && request.body.username && request.body.password
      && request.body.username.length && request.body.password.length) {
      // get uid with login
      debug('got a username & password : try to find uid with username');
      return checkPass();
    }
    return d10.realrest.err(500, { error: 'login failed', reason: 'invalid parameters' }, request.ctx);

    function checkPass() {
      users.authFromLoginPass(request.body.username, request.body.password)
        .then((userDoc) => {
          if (!userDoc) {
            const e = new Error('login failed');
            e.statusCode = 401;
            e.data = { error: 'login failed', reason: 'invalid credentials' };
            throw e;
          }
          debug('POST /api/session: user logged with login/password: ', userDoc._id);

          return setSessionAndLang(request.ctx, userDoc)
            .catch(() => {
              const e = new Error('Session storage failed');
              e.statusCode = 500;
              e.data = { error: 'session storage failed', reason: 'datastore failure' };
            });
        })
        .then(() => d10.realrest.err(200, { ok: true }, request.ctx))
        .catch((e) => {
          if (e.statusCode) {
            return d10.realrest.err(e.statusCode, e.data, request.ctx);
          }
          return d10.realrest.err(500, { error: 'login failed', reason: 'server messed up' }, request.ctx);
        });
    }
  });
};

function setSessionAndLang(ctx, userDoc) {
  return session.makeSession(userDoc)
    .then((userSession) => {
      session.fillUserCtx(ctx, userDoc, userSession);
      const cookie = { user: ctx.user.login, session: userSession._id.substring(2) };
      ctx.setCookie(cookie);
      if (ctx.user.lang) { ctx.lang = ctx.user.lang; }
      return ctx;
    })
    .catch((err) => {
      debug('POST/: bad response from makeSession', err);
      return err;
    });
}
