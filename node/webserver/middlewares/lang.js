const fs = require('fs');
const pause = require('pause');
const d10 = require('../../d10');
const mustache = require('../../mustache');
const session = require('../../session');

const debug = d10.debug('d10:lang');

module.exports = function langMiddleware(langRoot, tplRoot, cb) {

  let langs = false;
  let loadingLangs = false;
  const loadingLangsCb = [];

  /*
  * parse Accept-Language headers & returns the available matching language or the default language
  */
  function getHeadersLang(request, callback) {
    const accepted = request.headers['accept-language'] ? request.headers['accept-language'].split(',') : null;
    if (accepted === null || !accepted.length) {
      return callback(d10.config.templates.defaultLang);
    }
    function checkNext() {
      if (accepted.length === 0) {
        return callback(d10.config.templates.defaultLang);
      }
      const lng = accepted.shift().split(';').shift();
      return langExists(lng, (response) => {
        if (response) {
          callback(lng);
        } else {
          checkNext();
        }
      });
    }
    return checkNext();
  }

  function loadLangFiles(loadLangFilesCb) {
    if (langs !== false) {
      return loadLangFilesCb();
    }
    loadingLangsCb.push(loadLangFilesCb);

    if (loadingLangs) {
      return null;
    }
    loadingLangs = true;
    return fs.readdir(langRoot, (err, files) => {
      langs = {};
      files.filter(f => f.match(/\.js$/))
        .forEach((f) => {
          debug(`LANG: including ${langRoot}/${f}`);
          langs[f.replace(/\.js$/, '')] = require(`${langRoot}/${f}`);
        });
      loadingLangs = false;
      loadingLangsCb.forEach(loadingLangCb => loadingLangCb());
    });
  }

  function langExists(lng, langExistsCb) {
    const saneLng = lng.toLowerCase().replace(/\W+/g, '');
    if (langs[saneLng]) {
      return langExistsCb(true);
    }
    return langExistsCb(false);
  }


  /**
  *load a language definition file
  *
  * @param lng language
  * @param type template type ('server', 'client', 'shared')
  * @param cb callback ( called with args err & language object )
  *
  * eg. : loadLang('en','server',
  *        function(err,resp) { console.log(resp['homepage.html']['l:welcome']); });
  *
  */
  function loadLang(lng, type, loadLangCb) {
    if (!(lng in langs)) {
      debug('LANG unknown : ', lng);
      return loadLangCb(new Error(`lang not found: ${lng}`));
    }
    if (!(type in langs[lng])) {
      debug('LANG type unknown : ', type, lng);
      return loadLangCb(new Error(`lang type not found: ${lng}.${type}`));
    }
    return loadLangCb(null, langs[lng][type]);
  }

  /**
  * Parses the server template hash
  *
  *
  */
  function parseServerTemplate(request, tpl) {
    debug('LANG parseServerTemplate: ', tpl, request.url, request.ctx.lang);
    const prom = new Promise((resolve, reject) => {
      loadLang(request.ctx.lang, 'server', (err, hash) => {
        if (err) {
          reject(err);
          return;
        }
        fs.readFile(`${tplRoot}/${tpl}`, (err2, template) => {
          if (err2) {
            reject(err2);
            return;
          }
          const saneTemplate = template.toString();
          if (!(tpl in hash)) {
            resolve(saneTemplate);
          } else {
            resolve(mustache.lang_to_html(saneTemplate, hash[tpl]));
          }
        });
      });
    });
    return prom;
  }

  function getSupportedLangs(getSupportedLangsCb) {
    const prom = new Promise((resolve) => {
      const back = {};
      const keys = [];
      Object.keys(langs).forEach(key => keys.push(key));
      keys.sort();
      debug('lang keys: ', keys);
      keys.forEach((val) => { back[val] = langs[val].langName; });
      resolve(back);
    });
    if (getSupportedLangsCb) {
      prom.then(supportedLangs => getSupportedLangsCb(null, supportedLangs))
        .catch(getSupportedLangsCb);
    }
    return prom;
  }

  loadLangFiles(cb);

  return function langMiddlewareHandler(req, res, next) {
    function fetchFromBrowser() {
      function passTheCoochie() {
        handle.end();
        next();
        handle.resume();
      }
      const handle = pause(req);

      getHeadersLang(req, (lng) => {
        debug('LANG middleware: browser sniff: ', lng);
        req.ctx.lang = lng;
        if (req.ctx.session && req.ctx.session._id) {
          req.ctx.session.lang = lng;

          session.setSessionLang(req.ctx.session._id, lng)
            .catch(err => debug('LANG : session storage failed: ', err))
            .then(() => passTheCoochie());
        } else {
          passTheCoochie();
        }
      });
    }
    req.ctx = req.ctx || {};
    req.ctx.langUtils = {
      getSupportedLangs,
      parseServerTemplate,
      loadLang,
      langExists,
    };


    if (req.ctx.user && req.ctx.user.lang) {
      debug('LANG middleware: set from user');
      req.ctx.lang = req.ctx.user.lang;
      return next();
    }
    if (req.ctx.session && req.ctx.session.lang) {
      debug('LANG middleware: set from session');
      req.ctx.lang = req.ctx.session.lang;
      return next();
    }
    return fetchFromBrowser();
  };
};
