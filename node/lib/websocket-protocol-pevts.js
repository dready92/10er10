/* eslint-disable no-param-reassign */
const debug = require('../d10').debug('d10:websocket-protocol-pevts');
const emitter = require('./song-processor/song-processor-events');
const sessionService = require('../session');
const protocol = require('./websocket-protocol');

const protocolName = 'pevts';

function onMessage(message, socket) {
  let query;
  try {
    query = JSON.parse(message.payload);
  } catch (e) {
    debug('Badly formatted JSON payload');
    debug(message);
    return;
  }
  if (!query.session) {
    debug('No session parameter in query');
    return;
  }
  sessionService.getUser(query.session, (err, userId) => {
    if (err) {
      debug('Error fetching userId from session', err);
      return;
    }
    debug(`userId = ${userId}`);
    this.listenServerEvents(socket, userId);
  });
}

function websocketProtocolPevts() {
  this.handler = onMessage.bind(this);
}

websocketProtocolPevts.prototype.name = protocolName;
websocketProtocolPevts.prototype.handler = () => {};

websocketProtocolPevts.prototype.listenServerEvents = function listenServerEvents(socket, userId) {
  const events = {
    progress: (data) => {
      if (data.userId === userId) {
        data.event = 'song-processor:progress';
        sendProgressEvent(socket, data);
      }
    },
    end: (data) => {
      if (data.userId === userId) {
        data.event = 'song-processor:end';
        sendProgressEvent(socket, data);
      }
    },
    uploadEnd: (data) => {
      if (data.userId === userId) {
        data.event = 'song-processor:uploadEnd';
        sendProgressEvent(socket, data);
      }
    },
  };
  Object.keys(events).forEach((name) => {
    emitter.on(name, events[name]);
    socket.on('close', () => emitter.removeListener(name, events[name]));
  });
};

function sendProgressEvent(socket, data) {
  const line = protocol.formatMessage({ type: protocolName, payload: JSON.stringify(data) });
  try {
    socket.send(line, () => {});
  } catch (e) {
    debug('error while sending message');
  }
}


module.exports = websocketProtocolPevts;
