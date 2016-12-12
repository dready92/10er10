const express = require('express');
const join = require('path').join;

const contextMiddleware = require('./middlewares/context');
const cookieSessionMiddleware = require('./middlewares/cookie-session').cookieSession;
const langMiddleware = require('./middlewares/lang');
const ensureLoginMiddleware = require('./middlewares/ensure-login');

const homepageRoutes = require('../d10.router.homepage').homepage;
const rcPublicRoutes = require('../d10.router.rc').publicApi;

module.exports = {
  getD10Server,
};

function getD10Server(config) {
  const d10Router = express.Router();
  d10Router.use(contextMiddleware);
  d10Router.use('/js/', express.static('../views/10er10.com/js'));
  d10Router.use('/css/', express.static('../views/10er10.com/css'));
  d10Router.use('/html/rc/', express.static('../views/10er10.com/html/rc'));
  d10Router.use(cookieSessionMiddleware);
  d10Router.use(langMiddleware(join(__dirname, '../../../views/10er10.com/lang')), config.templates.node, () => {});
  homepageRoutes(d10Router);
  rcPublicRoutes(d10Router);
  d10Router.use(ensureLoginMiddleware);

  return d10Router;
}
