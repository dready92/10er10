var protocol = require("./websocket-protocol");
var debug = require("debug")("d10:websocket-router");

function router() {
};

router.prototype.types = {};
router.prototype.addType = function(name, handler) {
  this.types[name] = handler;
};

router.prototype.route = function(line, socket) {
  var message = protocol.parseMessage(line);
  if ( !message ) {
    debug("bad message: \""+line+"\" is ignored");
    return ;
  }
  if ( ! (message.type in this.types) ) {
    debug("unknown protocol type "+message.type+" is ignored");
    return ;
  }
  var onClose = this.sendToProtocolHandler(message, socket);

  if ( onClose ) {
    socket.on('close', onClose);
  }
};

router.prototype.sendToProtocolHandler = function(message, socket) {
  return this.types[message.type](message, socket, function(response) {
    if (response !== null 
        && typeof response != "undefined" 
        && typeof response != "string" ) {
      response = response+"";
    }
    var line = protocol.formatMessage({type: message.type, payload: response});
    try {
      socket.send(line, function() {});
    } catch (e) {
      debug("error while sending response");
    }
  });
};

exports=module.exports = router;