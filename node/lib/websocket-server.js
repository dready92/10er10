var debug = require("debug")("d10:websocket-server");

function websocketServer ( httpServer, d10Server ) {
  var wsId = 1;
  var wsServer = require('ws').Server;
  var d10wsServer = new wsServer({server: httpServer});
  var wsRouter = require("./websocket-router");
  var d10wsrouter = new wsRouter();
  var wrestProtocol = require("./websocket-protocol-wrest");
  var wrestProtocolInstance = new wrestProtocol(httpServer, d10Server);
  d10wsrouter.addType(wrestProtocolInstance.name, wrestProtocolInstance.handler);
  d10wsServer.on('connection', function(ws) {
    ws.d10id = wsId++;
    ws.on('close', function() {
      debug("socket close");
    });
    ws.on('message', function(message) {
      d10wsrouter.route(message,ws);
    });
  });
};

exports = module.exports = websocketServer;