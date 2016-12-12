const path = require('path');
const url = require('url');
const qs = require('qs');
const d10 = require('../../d10');

module.exports = function contextMiddleware(req, res, next) {
  req.ctx = { /* eslint no-param-reassign: 0*/
    request: req,
    response: res,
    headers: {},
    status: 404,
    session: {},
    remoteControlSession: {},
    setCookie(cookie) {
      const d = new Date();
      d.setTime(d.getTime() + d10.config.cookieTtl);
      const cookieName = escape(JSON.stringify(cookie));
      const expires = d.toUTCString();
      this.headers['Set-Cookie'] = `${d10.config.cookieName}=${cookieName}; expires=${expires}; path=${d10.config.cookiePath}`;
      this.headers['X-10er10-Auth-Token'] = escape(JSON.stringify(cookie));
    },
  };

  const u = url.parse('http://' + req.headers.host + req.url);
  req.query = u.query ? qs.parse(u.query) : {};
  req.basepath = path.dirname(u.pathname);
  next();
};
