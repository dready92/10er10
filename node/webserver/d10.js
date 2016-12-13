const express = require('express');
const join = require('path').join;

const contextMiddleware = require('./middlewares/context');
const cookieSessionMiddleware = require('./middlewares/cookie-session').cookieSession;
const langMiddleware = require('./middlewares/lang');
const ensureLoginMiddleware = require('./middlewares/ensure-login');

const homepageRoutes = require('../d10.router.homepage').homepage;
const rcPublicRoutes = require('../d10.router.rc').publicApi;
const downloadRoutes = require('../d10.router.audio.download').api;
const baseApiRoutes = require('../d10.router.api').api;
const plmApiRoutes = require('../d10.router.api.plm').api;
const listingApiRoutes = require('../d10.router.api.listing').api;
const songApiRoutes = require('../d10.router.song').api;
const imagesApiRoutes = require('../d10.router.images').api;
const invitesApiRoutes = require('../d10.router.invites').api;
const rcApiRoutes = require('../d10.router.rc').api;


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
  d10Router.use(langMiddleware(join(__dirname, '../../views/10er10.com/lang'), config.templates.node, () => {}));
  homepageRoutes(d10Router);
  rcPublicRoutes(d10Router);
  d10Router.use(ensureLoginMiddleware);
  downloadRoutes(d10Router);
  d10Router.use('/audio/', express.static(config.audio.dir));
  d10Router.use('/audioImages/', express.static(config.images.dir));
  baseApiRoutes(d10Router);
  plmApiRoutes(d10Router);
  listingApiRoutes(d10Router);
  songApiRoutes(d10Router);
  imagesApiRoutes(d10Router);
  rcApiRoutes(d10Router);
  invitesApiRoutes(d10Router);

  return d10Router;
}
