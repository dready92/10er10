let config;
const configParser = require('./configParser');
const d10 = require('./d10');

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
  const express = require('express');
  const d10Router = require('./webserver/d10').getD10Server(config);
  const invitesServer = require('./webserver/invites').getInvitesServer(config);
  var vhost = require('vhost');
  var  httpHelper = require(__dirname+"/httpHelper"),
    webSocketServer = require(__dirname+"/lib/websocket-server"),
    dosWatchdog = require(__dirname+"/dosWatchdog");

  process.chdir(__dirname);

  var child = require('child_process').fork(__dirname + '/bgworker.js');
  child.send({type: "configuration", production: isProduction});

  console.log("Database binding: "+config.couch.d10.dsn+"/"+config.couch.d10.database);

  var globalSrv = express();
    // 10er10 vhosts
  globalSrv.use(vhost(config.invites.domain,invitesServer));
  //   defaultServer
  globalSrv.use(d10Router);
  var nodeHTTPServer = globalSrv.listen(config.port);
  dosWatchdog.install(nodeHTTPServer);
  var wsServer = new webSocketServer(nodeHTTPServer, d10Router);

  nodeHTTPServer.on("error", function(err) {
    console.log(err);
  });

  console.log("Production mode ? ",config.production);
  console.log("Server listening on port", config.port);
};
