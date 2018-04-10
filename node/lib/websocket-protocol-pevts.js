var debug = require("../d10").debug("d10:websocket-protocol-pevts");
var emitter = require("./song-processor/song-processor-events");
var sessionService = require('../session');
var protocol = require("./websocket-protocol");

var protocolName = "pevts";

function onMessage(message, socket, callback) {
  try {
    var query = JSON.parse(message.payload);
  } catch (e) {
    debug("Badly formatted JSON payload");
    debug(message);
    return;
  }
  if ( !query.session ) {
    debug("No session parameter in query");
    return ;
  }
  sessionService.getUser(query.session, function(err,userId) {
    if ( err ) {
      debug("Error fetching userId from session",err);
      return ;
    }
    debug("userId = "+userId);
    this.listenServerEvents(socket, userId);
  }.bind(this));
};

function websocketProtocolPevts (httpServer, d10Server) {
  this.handler = onMessage.bind(this);
};

websocketProtocolPevts.prototype.name = protocolName;
websocketProtocolPevts.prototype.handler = function() {};

websocketProtocolPevts.prototype.listenServerEvents = function(socket, userId) {
  var events = {
    "progress": function(data) {
      if ( data.userId == userId ) {
        data.event = "song-processor:progress";
        sendProgressEvent(socket, data);
      }
    },
    "end": function(data) {
      if ( data.userId == userId ) {
        data.event = "song-processor:end";
        sendProgressEvent(socket, data);
      }
    },
    "uploadEnd": function(data) {
      if ( data.userId == userId ) {
        data.event = "song-processor:uploadEnd";
        sendProgressEvent(socket, data);
      }
    }
  };
  for (var i in events ) {
    emitter.on(i, events[i]);
    socket.on("close", function() {
      emitter.removeListener(i, events[i]);
    });
  }
};

function sendProgressEvent(socket, data) {
  var line = protocol.formatMessage({type: protocolName, payload: JSON.stringify(data)});
  try {
    socket.send(line, function() {});
  } catch (e) {
    debug("error while sending message");
  }
};


exports = module.exports = websocketProtocolPevts;