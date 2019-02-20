const debug = require('debug')('d10:websocket-protocol');


// protocol: 5 chars, 1 space, data
function parseMessage(line) {
  debug(`parsing line ${line}`);
  if (line.length < 5) {
    debug('bad message: should be at least 5 chars long');
    return false;
  }
  const message = { type: null, payload: null };
  if (line.length === 5) {
    message.type = line;
    return message;
  }
  if (line.charAt(5) !== ' ') {
    debug('bad message: 6th char is not a space');
    return false;
  }
  message.type = line.substring(0, 5);
  message.payload = line.substring(6);
  return message;
}

function formatMessage(message) {
  if (message.payload) {
    return `${message.type} ${message.payload}`;
  }
  return message.type;
}

exports.parseMessage = parseMessage;
exports.formatMessage = formatMessage;
