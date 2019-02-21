const express = require('express');
const morgan = require('morgan');
const { join } = require('path');

const logMiddleware = morgan('combined');
const contextMiddleware = require('./middlewares/context');
const langMiddleware = require('./middlewares/lang');

const invitesApiRoutes = require('../invites.router').api;

module.exports = {
  getInvitesServer,
};

function getInvitesServer(config) {
  const invitesServer = express.Router();
  invitesServer.use(logMiddleware);
  invitesServer.use(contextMiddleware);
  invitesServer.use(langMiddleware(join(__dirname, '../../views/invites.10er10.com/lang'), config.templates.invites, () => {}));
  invitesServer.use('/static/', express.static('../views/invites.10er10.com/static'));
  invitesApiRoutes(invitesServer);

  return invitesServer;
}
