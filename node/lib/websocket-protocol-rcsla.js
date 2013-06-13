var debug = require("../d10").debug("d10:websocket-protocol-rcsla");
var emitter = require("./song-processor/song-processor-events");
var sessionMiddleware = require("../cookieSessionMiddleware");
var protocol = require("./websocket-protocol");
var websocketStore = require("./websocket-store");

var protocolName = "rcsla";


function routeMessage(message, socket, callback) {
  var peerSocket = getPeer(socket);
  if ( !peerSocket ) {
    sendErrorResponse(message, socket, callback);
  }
  //reconstruct the message
  var line = protocol.formatMessage(message);
  try {
    socket.send(line, function() {});
  } catch (e) {
    debug("error while sending response");
  }
};

function getPeer(socket) {
  var userSockets = websocketStore.findByUser(socket.d10user);
  if ( !userSockets ) {
    return ;
  }
  for ( var i = 0; i < userSockets.length; i++ ) {
    if ( userSockets[i].d10type == 'remoteControlSession' ) {
      return userSockets[i];
    }
  }
};

function sendErrorResponse(message, socket, callback) {
  var response = JSON.stringify(
    {
      success: false,
      error: "ERRNOPEER"
    }
                      );
  callback(response);
};

function websocketProtocolRcsla (httpServer, d10Server) {
};

websocketProtocolRcsla.prototype.name = protocolName;
websocketProtocolRcsla.prototype.handler = function (message, socket, callback) {
  if ( !socket.d10user ) {
    try {
      var query = JSON.parse(message.payload);
    } catch (e) {
      debug("Badly formatted JSON payload");
      debug(message);
      return ;
    }
    authRequest(socket, query, function(err) {
      if ( err ) {
        sendErrorResponse(message, socket, callback);
      }
    });
  }
  routeMessage(message, socket, callback);
};

function authRequest (socket, query, then) {
  if ( !query.session ) {
    debug("Query ",query," invalid: should authenticate first");
  }
  sessionMiddleware.getUser(query.session, function(err,userId) {
    if ( err ) {
      debug("Error fetching userId from session",err);
      return then(err);
    }
    debug("userId = "+userId);
    var stored = websocketStore.store(socket, userId, "session");
    return stored ? then() : then(true);
  });
};


exports = module.exports = websocketProtocolPevts;