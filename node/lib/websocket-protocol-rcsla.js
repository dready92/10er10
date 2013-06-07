var debug = require("../d10").debug("d10:websocket-protocol-rcsla");
var emitter = require("./song-processor/song-processor-events");
var sessionMiddleware = require("../cookieSessionMiddleware");
var protocol = require("./websocket-protocol");
var websocketStore = require("./websocket-store");

var protocolName = "rcsla";

function websocketProtocolRcsla (httpServer, d10Server) {
};

websocketProtocolRcsla.prototype.name = protocolName;
websocketProtocolRcsla.prototype.handler = function (message, socket, callback) {
  try {
    var query = JSON.parse(message.payload);
  } catch (e) {
    debug("Badly formatted JSON payload");
    debug(message);
    return ;
  }
  if ( !socket.d10user ) {
    return authRequest(socket, query);
  }
};

function authRequest (socket, query) {
  if ( !query.session ) {
    debug("Query ",query," invalid: should authenticate first");
  }
  sessionMiddleware.getUser(query.session, function(err,userId) {
    if ( err ) {
      debug("Error fetching userId from session",err);
      return ;
    }
    debug("userId = "+userId);
    websocketStore.store(socket, userId, "session");
  });
};


exports = module.exports = websocketProtocolPevts;