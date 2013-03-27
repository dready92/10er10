"use strict";
define(["js/config"], function(config) {
  var socket;
  var types = {};
  
  function destroySocket() {
    socket = null;
  };
  
  var createSocketWithTimeout = function() {
    setTimeout(createSocket, 1000);
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
  
  return {
    addProtocol: addProtocol,
    socketReady: socketReady,
    send: send
  };
  
});