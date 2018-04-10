var debug = require("../d10").debug("d10:websocket-protocol-remot");
var emitter = require("./rc-events");
var sessionService = require("../session");
var protocol = require("./websocket-protocol");
var websocketStore = require("./websocket-store");

var protocolName = "remot";


function routeMessage(message, socket, callback) {
  var peerSockets = getPeer(socket);
  if ( !peerSockets || !peerSockets.length ) {
    return sendNoPeerErrorResponse(message, socket, callback);
  }
  //reconstruct the message
  debug("Sending message to peer sockets");
  var line = protocol.formatMessage(message);
  peerSockets.forEach(function(peerSocket) {
    try {
      peerSocket.send(line, function() {});
    } catch (e) {
      debug("error while routing message");
    }
  });
};

function getPeer(socket) {
  debug("number of webwockets for user: "+websocketStore.findByUser(socket.d10user).length);
  var userSockets = websocketStore.findByUser(socket.d10user).filter(function(s) {
    if ( !s.d10remotSession ) {
      return false;
    }
    return (s.d10remotSession !== socket.d10remotSession);
  });
  if ( !userSockets.length ) {
    return ;
  }
  return userSockets;
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

function unregisterSocket(userId, sessionId) {
  var sid = sessionId.substr(2);
  var sockets = websocketStore.findByUser(userId).filter(function(s) {
    debug("Socket, sessionId = ",s.d10remotSession, sid);
    if ( !s.d10remotSession ) {
      return false;
    }
    return (s.d10remotSession === sid);
  });
  if ( !sockets.length ) {
    debug("Weird, can't find socket for user",userId,"session",sessionId);
    return ;
  }
  var socket = sockets[0];
  websocketStore.remove(socket);
  socket.close(1000,"End of session");
};

function websocketProtocolRemot (httpServer, d10Server) {
  emitter.on("logout",function(id) {
    unregisterSocket(id.user,id.session);
  });
};

websocketProtocolRemot.prototype.name = protocolName;
websocketProtocolRemot.prototype.handler = function (message, socket, callback) {
  if ( !socket.d10remotUser ) {
    var query = parseMessage(message);
    if ( !query ) {
      return ;
    }
    authRequest(socket, query, function(err, userId, session) {
      if ( err ) {
        sendBadAuthErrorResponse(message, socket, callback);
      } else {
        socket.d10remotUser = userId;
        socket.d10remotSession = session;
        routeMessage(message, socket, callback);
      }
    });
    return ;
  }
  routeMessage(message, socket, callback);
};

var currentAuthRequests = 0;

function authRequest (socket, query, then) {
  currentAuthRequests++;
  debug("authRequest() currentAuthRequests: ",currentAuthRequests);
  if ( !query.session ) {
    debug("Query ",query," invalid: should give session id");
    currentAuthRequests--;
    return then(true);
  }
  sessionService.getUser(query.session, function(err,userId) {
    debug("authRequest.getUser() currentAuthRequests: ",currentAuthRequests);
    if ( err ) {
      debug("Error fetching userId from session",err);
      currentAuthRequests--;
      return then(err);
    }
    debug("userId = "+userId);
    var stored = websocketStore.store(socket, userId, "session");
    currentAuthRequests--;
    return stored ? then(false, userId, query.session) : then(true);
  });
};


exports = module.exports = websocketProtocolRemot;