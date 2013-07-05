"use strict";
define(["js/config", 
       "js/d10.events"
       ], function(config, pubsub) {
  var socket;
  var types = {};
  var socketURI = null; // location.host+config.base_url
  var socketCreatedPubsub = pubsub.topic("websocket:created");
  var socketClosedPubsub = pubsub.topic("websocket:closed");
  var createSocketTimeoutId = null;
  var socketAvailableWatchdogTimeoutId = null;
  
  function init(uri) {
    socketURI = uri;
    createSocket();
  };
  
  function destroySocket() {
    try {
      socket.close();
    } catch (e) {}
    socket = null;
    if ( socketAvailableWatchdogTimeoutId ) {
      clearTimeout(socketAvailableWatchdogTimeoutId);
      socketAvailableWatchdogTimeoutId = null;
    }
    debug("sending websocket:closed event");
    socketClosedPubsub.publish();
  };
  
  
  
  function socketAvailableWatchdog() {
    if ( socketReady() && send("ping","ping") ) {
      debug("sending websocket:created event");
      socketCreatedPubsub.publish();
    } else {
      socketAvailableWatchdogTimeoutId = setTimeout(socketAvailableWatchdog,300);
    }
  };
  
  var createSocketWithTimeout = function() {
    if ( !createSocketTimeoutId ) {
      createSocketTimeoutId = setTimeout(createSocket, 1000);
    }
  };
  
  var socketId = 1;
  function createSocket() {
    if ( createSocketTimeoutId ) {
      clearTimeout(createSocketTimeoutId);
    }
    debug("CREATESOCKET########################################",socket);
    createSocketTimeoutId = null;
    socket = new WebSocket("ws://"+socketURI, "protocolOne");
    socket.d10id = socketId++;
    socket.onclose = function() {
      destroySocket();
      createSocketWithTimeout();
    };
    /*
    socket.onerror = function() {
      destroySocket();
      createSocketWithTimeout();
    };
    */
    socket.onmessage = onmessage;
    socketAvailableWatchdog();
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
    debug("d10.websocket:send()");
    if ( !socketReady() ) {
      debug("d10.websocket:send(",name,") returns false");
      return false;
    }
    try {
      socket.send(name+" "+message);
      debug("d10.websocket:send(",name,") returns true");
      return true;
    } catch (e) {
      debug("d10.websocket:send(",name,") returns false",e);
      return false;
    }
  };
  
  function isValidProtocol(name) {
    return (name in types);
  }
  
  return {
    addProtocol: addProtocol,
    socketReady: socketReady,
    send: send,
    isValidProtocol: isValidProtocol,
    init: init
  };
  
});