var debug = require("debug")("d10:websocket-server");

function websocketServer ( httpServer, d10Server ) {
  var wsId = 1;
  var sockets = {};
  var wsServer = require('ws').Server;
  var d10wsServer = new wsServer({server: httpServer});
  this.createRouter();
  this.registerProtocols();
  d10wsServer.on('connection', function(ws) {
    ws.d10id = wsId++;
    sockets[ws.d10id] = ws;
    ws.on('close', function() {
      delete sockets[ws.d10id];
      debug("socket close");
    });
    ws.on('message', function(message) {
      this.router.route(message,ws);
    }.bind(this));
  });
};

websocketServer.prototype.router = null;
websocketServer.prototype.createRouter = function() {
  var wsRouter = require("./websocket-router");
  this.router = new wsRouter();
};

websocketServer.prototype.registerProtocols = function() {
  this.registerWrestProtocol();
};

websocketServer.prototype.registerWrestProtocol = function() {
  var wrestProtocol = require("./websocket-protocol-wrest");
  var wrestProtocolInstance = new wrestProtocol(httpServer, d10Server);
  this.router.addType(wrestProtocolInstance.name, wrestProtocolInstance.handler);
};

exports = module.exports = websocketServer;