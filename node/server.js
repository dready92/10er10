let config;
const express = require('express');
const fork = require('child_process').fork;
const join = require('path').join;
const configParser = require('./configParser');
const d10 = require('./d10');
const vhost = require('vhost');
const WebSocketServer = require('./lib/websocket-server');
const dosWatchdog = require('./dosWatchdog');


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
  d10.setConfig(config);
  onConfig(prod);
});


function onConfig(isProduction) {
  const d10RouterModule = require('./webserver/d10');
  const invitesServerModule = require('./webserver/invites');
  const d10Router = d10RouterModule.getD10Server(config);
  const invitesServer = invitesServerModule.getInvitesServer(config);
  process.chdir(__dirname);

  const child = fork(join(__dirname, 'bgworker.js'));
  child.send({ type: 'configuration', production: isProduction });

  console.log(`Database binding: ${config.couch.d10.dsn}/${config.couch.d10.database}`);

  const globalSrv = express();
    // 10er10 vhosts
  globalSrv.use(vhost(config.invites.domain, invitesServer));
  //   defaultServer
  globalSrv.use(d10Router);
  const nodeHTTPServer = globalSrv.listen(config.port);
  dosWatchdog.install(nodeHTTPServer);
  new WebSocketServer(nodeHTTPServer, d10Router);

  nodeHTTPServer.on('error', (err) => {
    console.log(err);
  });

  console.log("Production mode ? ",config.production);
  console.log("Server listening on port", config.port);
};
