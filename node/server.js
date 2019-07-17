/* eslint-disable no-console */
let config;
const express = require('express');
const vhost = require('vhost');

const configParser = require('./configParser');
const d10 = require('./d10');
const configChecker = require('./configChecker');
const WebSocketServer = require('./lib/websocket-server');
const dosWatchdog = require('./dosWatchdog');
const d10WebServer = require('./webserver/d10');
const d10InvitesServer = require('./webserver/invites');

configParser.getConfig((foo, cfg) => {
  config = cfg;
  // production test
  let prod = false;
  if (process.argv.length > 2 && process.argv[2] === '-p') {
    prod = true;
    configParser.switchProd();
  } else {
    configParser.switchDev();
  }
  d10.setConfig(config)
    .then(() => onConfig(prod));
});


function onConfig() {
  return configChecker().then((checksResponse) => {
    if (checksResponse.errors.length) {
      console.log('Configuration checker encountered problems:');
      checksResponse.errors.forEach(resp => console.log(resp.component, resp.label, resp.error));
      process.exit(1);
    }
    setupServers();
  })
    .catch((err) => {
      console.log('Configuration checker encountered an error');
      console.log(err);
      process.exit(1);
    });
}

function setupServers() {
  const d10RouterModule = d10WebServer;
  const invitesServerModule = d10InvitesServer;
  const d10Router = d10RouterModule.getD10Server(config);
  const invitesServer = invitesServerModule.getInvitesServer(config);

  const globalSrv = express();
  // 10er10 vhosts
  globalSrv.use(vhost(config.invites.domain, invitesServer));
  //   defaultServer
  globalSrv.use(d10Router);
  const nodeHTTPServer = globalSrv.listen(config.port);
  dosWatchdog.install(nodeHTTPServer);
  // eslint-disable-next-line no-new
  new WebSocketServer(nodeHTTPServer, d10Router);

  nodeHTTPServer.on('error', (err) => {
    console.log(err);
  });

  console.log('Production mode ? ', config.production);
  console.log('Server listening on port', config.port);
}
