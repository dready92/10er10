let config;
const configParser = require(__dirname + '/configParser');
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
  var favicon = require('serve-favicon');
  var morgan = require('morgan');
  var logMiddleware = morgan('combined');
  var compression = require('compression');
  var vhost = require('vhost');
  var  httpHelper = require(__dirname+"/httpHelper"),
    cookieSession = require(__dirname+"/cookieSessionMiddleware"),
    webSocketServer = require(__dirname+"/lib/websocket-server"),
    nodeVersion = require(__dirname+"/nodeVersion"),
    dosWatchdog = require(__dirname+"/dosWatchdog");


  process.chdir(__dirname);

  var child = require('child_process').fork(__dirname + '/bgworker.js');
  child.send({type: "configuration", production: isProduction});

  console.log("Database binding: "+config.couch.d10.dsn+"/"+config.couch.d10.database);

  function staticInvites(app) {
    app.use('/static/', express.static('../views/invites.10er10.com/static'));
  };

  function startServer() {

    var d10Server = express();
    d10Server.use(favicon('../views/10er10.com/favicon.ico'));

    if ( !config.production ) {
      d10Server.use(logMiddleware);
    }

    if ( config.gzipContentEncoding ) {
      var compressFilter = function(req, res){
        var type = res.getHeader('Content-Type') || '';
        return type.match(/css|text|javascript|json|x-font-ttf/);
      };
      d10Server.use(compression({filter: compressFilter}));
    }
    d10Server.use(d10Router);
//    stack.forEach(function(mw) { d10Server.use(mw); });

    var globalSrv = express();
      // 10er10 vhosts
      globalSrv.use(vhost(config.invites.domain,invitesServer));
    //   defaultServer
      globalSrv.use(d10Server);
    ;
    var nodeHTTPServer = globalSrv.listen(config.port);
    dosWatchdog.install(nodeHTTPServer);
    var wsServer = new webSocketServer(nodeHTTPServer, d10Server);

    nodeHTTPServer.on("error", function(err) {
      console.log(err);
    });


    d10Server.on("clientError",function() {
      console.log("CLIENT ERROR");
      console.log(arguments);
    });
    console.log("Production mode ? ",config.production);
    console.log("Server listening on port", config.port);
  };
};
