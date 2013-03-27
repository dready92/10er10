var debug = require("debug")("d10:websocket-protocol-wrest");
var httpRequest = require("./websocket-request-mock");
var httpResponse = require("./websocket-response-mock");

function onMessage(message, callback) {
  try {
    var query = JSON.parse(message.payload);
  } catch (e) {
    debug("Badly formatted JSON payload");
    return ;
  }
  if ( !query.url ) {
    debug("No url parameter in query");
    return ;
  }
  if ( !query.method ) {
    debug("No method parameter in query");
    return ;
  }
  if ( !query.headers ) {
    query.headers = {};
  }
  var req = new httpRequest(query);
  var res = new httpResponse(this.uid++,function(statusCode, statusMessage, body) {
    var contentType = res.headers["Content-Type"] || null;
    var response = JSON.stringify(
      {
        request_id: query.request_id,
        statusCode: statusCode,
        statusMessage: statusMessage,
        body: body,
        contentType: contentType
      }
    );
    callback(response);
  });
  this.d10Server.handle(req,res);
};

function websocketProtocolWrest (httpServer, d10Server) {
  this.d10Server = d10Server;
  this.uid = 1;
  this.handler = onMessage.bind(this);
};

websocketProtocolWrest.prototype.d10Server = null;
websocketProtocolWrest.prototype.name = "wrest";
websocketProtocolWrest.prototype.handler = function() {};

exports = module.exports = websocketProtocolWrest;