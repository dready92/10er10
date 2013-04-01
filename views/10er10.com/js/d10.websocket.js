"use strict";
define(["js/config", "js/d10.websocket.protocol.pevts"], function(config, pevtsWebsocketProtocol) {
  var socket;
  var types = {};
  
  function destroySocket() {
    socket = null;
  };
  
  var createSocketWithTimeout = function() {
    setTimeout(createSocket, 1000);
  };
  
  function registerPevts() {
    try {
      var session = JSON.parse($.cookie("doBadThings")).session;
    } catch(e) {
      debug("Unable to get session from cookie: ",e);
      return false;
    }
    var sent = send(pevtsWebsocketProtocol.name, pevtsWebsocketProtocol.prepare({session: session}));
    if ( !sent ) {
      debug("Message sending through websocket failed");
    }
  };
  
  function createSocket() {
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
    setTimeout(registerPevts, 1000);
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
  
  createSocket();
  
  addProtocol(pevtsWebsocketProtocol.name, pevtsWebsocketProtocol.onmessage);
  
  return {
    addProtocol: addProtocol,
    socketReady: socketReady,
    send: send
  };
  
});