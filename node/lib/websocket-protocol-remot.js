/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
const debug = require('../d10').debug('d10:websocket-protocol-remot');
const emitter = require('./rc-events');
const sessionService = require('../session');
const protocol = require('./websocket-protocol');
const websocketStore = require('./websocket-store');

const protocolName = 'remot';


function routeMessage(message, socket, callback) {
  const peerSockets = getPeer(socket);
  if (!peerSockets || !peerSockets.length) {
    return sendNoPeerErrorResponse(message, socket, callback);
  }
  // reconstruct the message
  debug('Sending message to peer sockets');
  const line = protocol.formatMessage(message);
  return peerSockets.forEach((peerSocket) => {
    try {
      peerSocket.send(line, () => {});
    } catch (e) {
      debug('error while routing message');
    }
  });
}

function getPeer(socket) {
  debug(`number of webwockets for user: ${websocketStore.findByUser(socket.d10user).length}`);
  const userSockets = websocketStore.findByUser(socket.d10user).filter((s) => {
    if (!s.d10remotSession) {
      return false;
    }
    return (s.d10remotSession !== socket.d10remotSession);
  });
  if (!userSockets.length) {
    return null;
  }
  return userSockets;
}

function parseMessage(message) {
  let query;
  try {
    query = JSON.parse(message.payload);
  } catch (e) {
    debug('Badly formatted JSON payload');
    debug(message);
    return null;
  }
  return query;
}

function sendNoPeerErrorResponse(message, socket, callback) {
  return sendErrorResponse('ERRNOPEER', message, socket, callback);
}

function sendBadAuthErrorResponse(message, socket, callback) {
  return sendErrorResponse('ERRBADAUTH', message, socket, callback);
}

function sendErrorResponse(error, message, socket, callback) {
  const query = parseMessage(message);
  if (!query) {
    return;
  }
  const responseType = (query.type === 'request') ? 'response' : 'servererror';
  const response = JSON.stringify(
    {
      success: false,
      error,
      uid: query.uid,
      type: responseType,
      args: [error],
    },
  );
  callback(response);
}

function unregisterSocket(userId, sessionId) {
  const sid = sessionId.substr(2);
  const sockets = websocketStore.findByUser(userId).filter((s) => {
    debug('Socket, sessionId = ', s.d10remotSession, sid);
    if (!s.d10remotSession) {
      return false;
    }
    return (s.d10remotSession === sid);
  });
  if (!sockets.length) {
    debug("Weird, can't find socket for user", userId, 'session', sessionId);
    return;
  }
  const socket = sockets[0];
  websocketStore.remove(socket);
  socket.close(1000, 'End of session');
}

function websocketProtocolRemot() {
  emitter.on('logout', (id) => {
    unregisterSocket(id.user, id.session);
  });
}

websocketProtocolRemot.prototype.name = protocolName;
websocketProtocolRemot.prototype.handler = (message, socket, callback) => {
  if (!socket.d10remotUser) {
    const query = parseMessage(message);
    if (!query) {
      return;
    }
    authRequest(socket, query, (err, userId, session) => {
      if (err) {
        sendBadAuthErrorResponse(message, socket, callback);
      } else {
        socket.d10remotUser = userId;
        socket.d10remotSession = session;
        routeMessage(message, socket, callback);
      }
    });
    return;
  }
  routeMessage(message, socket, callback);
};

let currentAuthRequests = 0;

function authRequest(socket, query, then) {
  currentAuthRequests++;
  debug('authRequest() currentAuthRequests: ', currentAuthRequests);
  if (!query.session) {
    debug('Query ', query, ' invalid: should give session id');
    currentAuthRequests--;
    return then(true);
  }
  return sessionService.getUser(query.session, (err, userId) => {
    debug('authRequest.getUser() currentAuthRequests: ', currentAuthRequests);
    if (err) {
      debug('Error fetching userId from session', err);
      currentAuthRequests--;
      return then(err);
    }
    debug(`userId = ${userId}`);
    const stored = websocketStore.store(socket, userId, 'session');
    currentAuthRequests--;
    return stored ? then(false, userId, query.session) : then(true);
  });
}


module.exports = websocketProtocolRemot;
