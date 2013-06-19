var debug = require("debug")("d10:websocket-server");
var util = require("util");
var dosWatchdog = require("../dosWatchdog");
var webSocketStore = require("./websocket-store");

function websocketServer ( httpServer, d10Server ) {
  var wsId = 1;
  var wsServer = require('ws').Server;
  var d10wsServer = new wsServer({server: httpServer});
  this.createRouter();
  this.registerProtocols(httpServer, d10Server);
  d10wsServer.on('connection', function(ws) {
    ws.d10id = wsId++;
    this.bindWebSocketListeners(ws);
  }.bind(this));
  
  d10wsServer.on('error', function(err) {
    if ( err.errno === 'EMFILE' ) {
      console.log("EMFILE !!!");
      dosWatchdog.garbage();
    } else {
      throw err;
    }
  });
  
};

websocketServer.prototype.router = null;
websocketServer.prototype.createRouter = function() {
  var wsRouter = require("./websocket-router");
  this.router = new wsRouter();
};

websocketServer.prototype.registerProtocols = function(httpServer, d10Server) {
  this.registerWrestProtocol(httpServer, d10Server);
  this.registerPevtsProtocol(httpServer, d10Server);
  this.registerRemotProtocol(httpServer, d10Server);
};

websocketServer.prototype.registerWrestProtocol = function(httpServer, d10Server) {
  var wrestProtocol = require("./websocket-protocol-wrest");
  var wrestProtocolInstance = new wrestProtocol(httpServer, d10Server);
  this.router.addType(wrestProtocolInstance.name, wrestProtocolInstance.handler);
};

websocketServer.prototype.registerPevtsProtocol = function(httpServer, d10Server) {
  var pevtsProtocol = require("./websocket-protocol-pevts");
  var pevtsProtocolInstance = new pevtsProtocol(httpServer, d10Server);
  this.router.addType(pevtsProtocolInstance.name, pevtsProtocolInstance.handler);
};

websocketServer.prototype.registerRemotProtocol = function(httpServer, d10Server) {
  var remotProtocol = require("./websocket-protocol-remot");
  var remotProtocolInstance = new remotProtocol(httpServer, d10Server);
  this.router.addType(remotProtocolInstance.name, remotProtocolInstance.handler);
};


websocketServer.prototype.bindWebSocketListeners = function(ws) {
  ws.on('message', function(message) {
    this.router.route(message,ws);
  }.bind(this));
};



exports = module.exports = websocketServer;
