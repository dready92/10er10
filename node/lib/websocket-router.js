const debug = require('debug')('d10:websocket-router');
const protocol = require('./websocket-protocol');

class Router {
  constructor() {
    this.types = {};
  }

  addType(name, handler) {
    this.types[name] = handler;
  }

  route(line, socket) {
    const message = protocol.parseMessage(line);
    if (!message) {
      debug(`bad message: "${line}" is ignored`);
      return;
    }
    if (!(message.type in this.types)) {
      debug(`unknown protocol type ${message.type} is ignored`);
      return;
    }
    const onClose = this.sendToProtocolHandler(message, socket);

    if (onClose) {
      socket.on('close', onClose);
    }
  }

  sendToProtocolHandler(message, socket) {
    return this.types[message.type](message, socket, (response) => {
      if (response !== null
        && typeof response !== 'undefined'
        && typeof response !== 'string') {
        // eslint-disable-next-line no-param-reassign
        response += '';
      }
      const line = protocol.formatMessage({ type: message.type, payload: response });
      try {
        socket.send(line, () => { });
      } catch (e) {
        debug('error while sending response');
      }
    });
  }
}

module.exports = Router;
