"use strict";
define(["js/config", 
       "js/d10.events"
       ], function(config, pubsub) {
  var socket;
  var types = {};
  
  var socketCreatedPubsub = pubsub.topic("websocket:created");
  var socketClosedPubsub = pubsub.topic("websocket:closed");
  var createSocketTimeoutId = null;
  
  function destroySocket() {
    socket = null;
    debug("sending websocket:closed event");
    socketClosedPubsub.publish();
  };
  
  var createSocketWithTimeout = function() {
    if ( !createSocketTimeoutId ) {
      createSocketTimeoutId = setTimeout(createSocket, 1000);
    }
  };
  
  function createSocket() {
    createSocketTimeoutId = null;
    socket = new WebSocket("ws://"+location.host+config.base_url, "protocolOne");
    socket.onclose = function() {
      destroySocket();
      createSocketWithTimeout();
    };
    socket.onerror = function() {
      destroySocket();
      createSocketWithTimeout();
    };
    socket.onmessage = onmessage;
    debug("sending websocket:created event");
    socketCreatedPubsub.publish();
  };
  
  function onmessage (message) {
    if ( !message.data || !message.data.length ) {
      debug("websocket message "+ message.data+" ignored");
      return ;
    }
    var protocol = message.data.substring(0,5);
    if ( ! (protocol in types ) ) {
      debug("unknown protocol ",protocol);
      return ;
    }
    types[protocol](message.data.substring(6));
  };
  
  function addProtocol (name, handler) {
    types[name] = handler;
  };
  
  function socketReady () {
    if ( !socket ) {
      return false;
    }
    return socket.readyState === WebSocket.OPEN ;
  };
  
  function send(name, message) {
    if ( !socketReady() ) {
      return false;
    }
    socket.send(name+" "+message);
    return true;
  };
  
  function isValidProtocol(name) {
    return (name in types);
  }
  
  createSocket();
  
  return {
    addProtocol: addProtocol,
    socketReady: socketReady,
    send: send,
    isValidProtocol: isValidProtocol
  };
  
});