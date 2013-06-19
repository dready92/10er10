var debug = require("../d10").debug("d10:websocket-protocol-remot");
var emitter = require("./song-processor/song-processor-events");
var sessionMiddleware = require("../cookieSessionMiddleware");
var protocol = require("./websocket-protocol");
var websocketStore = require("./websocket-store");

var protocolName = "remot";


function routeMessage(message, socket, callback) {
  var peerSocket = getPeer(socket);
  if ( !peerSocket ) {
    return sendNoPeerErrorResponse(message, socket, callback);
  }
  //reconstruct the message
  debug("Sending message to peer socket");
  var line = protocol.formatMessage(message);
  try {
    peerSocket.send(line, function() {});
  } catch (e) {
    debug("error while sending response");
  }
};

function getPeer(socket) {
  var userSockets = websocketStore.findByUser(socket.d10user).filter(function(s) {
    var back = (s === socket) ? false : true ;
    return back;
  });
  if ( !userSockets.length ) {
    return ;
  }
  return userSockets[0];
};

function parseMessage(message) {
  try {
    var query = JSON.parse(message.payload);
  } catch (e) {
    debug("Badly formatted JSON payload");
    debug(message);
    return ;
  }
  return query;
};

function sendNoPeerErrorResponse (message, socket, callback) {
  return sendErrorResponse("ERRNOPEER", message, socket, callback);
};

function sendBadAuthErrorResponse (message, socket, callback) {
  return sendErrorResponse("ERRBADAUTH", message, socket, callback);
};

function sendErrorResponse(error, message, socket, callback) {
  var query = parseMessage(message);
    if ( !query ) {
      return ;
    }
  var responseType = (query.type == "request") ? "response" : "servererror";
  var response = JSON.stringify(
    {
      success: false,
      error: error,
      uid: query.uid,
      type: responseType,
      args: [error]
    }
                      );
  callback(response);
};

function websocketProtocolRemot (httpServer, d10Server) {
};

websocketProtocolRemot.prototype.name = protocolName;
websocketProtocolRemot.prototype.handler = function (message, socket, callback) {
  if ( !socket.d10user ) {
    var query = parseMessage(message);
    if ( !query ) {
      return ;
    }
    authRequest(socket, query, function(err) {
      if ( err ) {
        sendBadAuthErrorResponse(message, socket, callback);
      } else {
        routeMessage(message, socket, callback);
      }
    });
    return ;
  }
  routeMessage(message, socket, callback);
};

function authRequest (socket, query, then) {
  if ( !query.session ) {
    debug("Query ",query," invalid: should give session id");
    return then(true);
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


exports = module.exports = websocketProtocolRemot;