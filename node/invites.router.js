/* eslint-disable prefer-destructuring */
const bodyParser = require('body-parser');
const fs = require('fs');
const promisify = require('util').promisify;
const d10 = require('./d10');
const users = require('./d10.users');

const debug = d10.debug('d10:invites-router');
const jsonParserMiddleware = bodyParser.json();

const errCodes = {
  430: 'Login already registered',
  431: 'Login too short',
  432: 'Login contains invalid characters',
  440: 'Password does not contain enough characters',
  441: 'Password does not contain enough different characters',
};

function isValidCode(code, callback) {
  if (code.substr(0, 2) !== 'in') {
    callback(400);
  }

  d10.mcol(d10.COLLECTIONS.INVITES).findOne({ _id: code })
    .then((invite) => {
      if (!invite) {
        const e = new Error('Not Found');
        e.code = 404;
        throw e;
      }
      const ttl = d10.config.invites.ttl * 60 * 60 * 24;
      const now = new Date().getTime() / 1000;
      if (invite.creation_time + ttl < now) {
        const e = new Error('Expired');
        e.code = 400;
        throw e;
      }
      callback(false, invite);
    })
    .then(invite => callback(false, invite))
    .catch(err => callback(err.code || 500));
}

function createAccount(request, response, invite) {
  return d10.mcol(d10.COLLECTIONS.USERS).findOne({ _id: invite.from })
    .then((parent) => {
      if (!parent) {
        const e = new Error('Not found');
        e.code = 404;
        throw e;
      }
      const uid = d10.uid();
      const opts = {
        parent: parent._id,
        depth: parent.depth || 1,
        uuid: uid,
        callback(err) {
          if (err) {
            response.writeHead(500, {});
            response.end(JSON.stringify(err));
          } else {
            response.writeHead(200, {});
            response.end('ok');
            d10.mcol(d10.COLLECTIONS.INVITES).deleteOne({ _id: invite._id })
              .catch((err2) => {
                debug('Error while deleting invite document ', err2);
              });
          }
        },
      };
      users.createUser(request.body.login, request.body.password, opts);
    });
}


exports.api = function api(app) {
  app.post('/code/checkLogin', jsonParserMiddleware, (request, response, next) => {
    // eslint-disable-next-line consistent-return
    isValidCode(request.body.code, (err) => {
      if (err) { return next(); }
      users.isValidLogin(request.body.login, (err2) => {
        if (err2) {
          if (errCodes[err2]) {
            response.writeHead(err2, errCodes[err2], {});
          } else {
            response.writeHead(err2, {});
          }
        } else {
          response.writeHead(200, {});
        }
        response.end();
      });
    });
  });

  app.post('/code/checkPassword', jsonParserMiddleware, (request, response, next) => {
    // eslint-disable-next-line consistent-return
    isValidCode(request.body.code, (err) => {
      if (err) { return next(); }
      users.isValidPassword(request.body.password, (err2) => {
        if (err2) {
          if (errCodes[err2]) {
            response.writeHead(err2, errCodes[err2], {});
          } else {
            response.writeHead(err2, {});
          }
        } else {
          response.writeHead(200, {});
        }
        response.end();
      });
    });
  });
  app.post('/code/createAccount', jsonParserMiddleware, (request, response, next) => {
    // eslint-disable-next-line consistent-return
    isValidCode(request.body.code, (err, doc) => {
      if (err) { return next(); }

      Promise.all([
        new Promise((resolve, reject) => {
          users.isValidLogin(request.body.login, (err2, valid) => {
            if (err2) {
              reject(err2);
            } else {
              resolve(valid);
            }
          });
        }),
        new Promise((resolve, reject) => {
          users.isValidPassword(request.body.password, (err2, valid) => {
            if (err2) {
              reject(err2);
            } else {
              resolve(valid);
            }
          });
        }),
      ])
        .then(() => {
          createAccount(request, response, doc);
        })
        .catch((err2) => {
          if (errCodes[err2]) {
            response.writeHead(err2, errCodes[err2], {});
          } else {
            response.writeHead(err2, {});
          }
          response.end();
        });
    });
  });
  app.get('/code/:id', (request, response, next) => {
    // eslint-disable-next-line consistent-return
    isValidCode(request.params.id, (err) => {
      if (err) { return next(); }
      const headers = {
        'Content-Type': 'text/html; charset=utf-8',
        Charset: 'utf-8',
      };
      // base_url,

      fs.stat(`${d10.config.templates.invites}/html/step1.${request.ctx.lang}.html`, (err2) => {
        const files = {};
        let lang = request.ctx.lang;
        if (err2) {
          files.step1 = `${d10.config.templates.invites}/html/step1.${d10.config.templates.defaultLang}.html`;
          files.step2 = `${d10.config.templates.invites}/html/step2.${d10.config.templates.defaultLang}.html`;
          lang = request.ctx.lang;
        } else {
          files.step1 = `${d10.config.templates.invites}/html/step1.${request.ctx.lang}.html`;
          files.step2 = `${d10.config.templates.invites}/html/step2.${request.ctx.lang}.html`;
        }
        const readFile = promisify(fs.readFile);
        Promise.all([
          readFile(files.step1),
          readFile(files.step2),
          fs.readFile(`${d10.config.templates.invites}homepage.html`),
        ])
          .then(([step1, step2, homepage]) => {
            request.ctx.langUtils.loadLang(lang, 'server', (err3, hash) => {
              if (err3) {
                throw err3;
              }
              response.writeHead(200, headers);
              const homepageS = homepage.toString();
              const partials = {
                step1: step1.toString(),
                step2: step2.toString(),
              };
              response.end(
                d10.mustache.to_html(
                  d10.mustache.lang_to_html(homepageS, hash['homepage.html'], partials),
                  {
                    site_url: '/',
                    websiteUrl: d10.config.invites.websiteUrl,
                    code: request.params.id,
                  },
                ),
              );
            });
          })
          // eslint-disable-next-line consistent-return
          .catch((err3) => {
            if (err3) {
              debug(`ERROR: for lang ${request.ctx.lang}`, err3);
              response.writeHead(500, headers);
              return response.end('The website got an error trying to fetch the page.');
            }
          });
      });
    });
  });
};
