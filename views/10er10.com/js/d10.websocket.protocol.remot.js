/**
 * 
 * remot.setVolume(0.4, function(err,resp) {
 *  console.log("volume set to "+resp);
 * });
 * 
 * addRemoteEndPoint("setVolume", function(arg1, callback) {
 *   
 * }
 * 
 * addLocalEndpoint("setVolume", function(arg, callback) {
 *    playlist.setVolume(arg);
 *    callback(null, args);
 * }
 * 
 * 
 */

"use strict";
define(["js/config", "js/d10.toolbox", "js/d10.websocket", "js/d10.events"], 
       function(config, toolbox, websocket, pubsub) {
  var name = "remot";
  var totalRequests = 1;
  var endpoints = {};
  var requestFilters = {};
  var TYPE_REQUEST = "request";
  var TYPE_RESPONSE = "response";
  var TYPE_EVENT = "event";
  var TYPE_SERVERERROR = "servererror";
  var SERVER_ERROR_NOPEER = "ERRNOPEER";
  var SERVER_ERROR_BADAUTH = "ERRBADAUTH";
  var STATUS_SUCCESS = true;
  var STATUS_ERROR = false;
  var ERROR_ENDPOINT_NOT_FOUND = "ERRNOENDPOINT";
  var requests = {};
  var uniqId = toolbox.microtime();
  
  function newUid() {
    var uid = uniqId+'_'+totalRequests++;
    return uid;
  };
  
  function getSession() {
    var cookie;
    try {
      debug("cookie:",config.cookieName,$.cookie(config.cookieName));
      cookie = JSON.parse($.cookie(config.cookieName));
    } catch(e) {
      debug("cookie parsing failed");
      return {};
    }
    return cookie.remoteControlSession ? cookie.remoteControlSession : cookie.session;
  };
  
  var addLocalEndPoint = function(name, callback) {
    endpoints[name] = callback;
  };
  
  var addRemoteEndPoint = function(name) {
    if ( !name ) {
      throw "addRemoteEndPoint: no name given";
    }    
    remotProtocol[name] = function() {
      var parameters = Array.prototype.slice.call(arguments,0);
      var callback = null;
      if ( parameters.length ) {
        if ( $.isFunction(parameters[ (parameters.length - 1) ]) ) {
          callback = parameters.pop();
        }
      }
      var uid = newUid();
      var request = new remotRequest (name, uid, parameters);
      return request.send(callback);
    };
  };
  
  function addRequestFilter(name, callback) {
    if ( ! requestFilters[name] ) {
      requestFilters[name] = [];
    }
    requestFilters[name].push(callback);
  };
  
  function prepare(request) {
    debug("preparing",request);
    return JSON.stringify(request);
  };
  
  function onmessage (strMessage) {
    try {
      var wsMessage = JSON.parse( strMessage );
    } catch(e) {
      debug("Bad websocket message ",strMessage," can't be parsed");
      return ;
    }
    if ( ! ("uid" in wsMessage) ) {
      debug("invalid message doesn't have uid");
      return ;
    }
    if( ! ("type" in wsMessage) ) {
      debug("invalid message doesn't have type");
      return ;
    }
    if ( wsMessage.type == TYPE_REQUEST ) {
      onRequestMessage(wsMessage);
    } else if (wsMessage.type == TYPE_RESPONSE ) {
      onResponseMessage(wsMessage);
    } else if (wsMessage.type == TYPE_EVENT ) {
      onEventMessage(wsMessage);
    } else if (wsMessage.type == TYPE_SERVERERROR ) {
      onServerErrorMessage(wsMessage);
    } else {
      debug("unkown message type", wsMessage.type);
      return ;
    }
  };

  function buildResponseCallback(wsMessage) {
    return function(err) {
      var args = Array.prototype.slice.call(arguments,0);
      var response = buildResponseObject(wsMessage.uid, wsMessage.endpoint, args);
      websocket.send(name, prepare(response));
    };
  };
  
  function buildResponseObject(uid, endpoint, args) {
    var response = {
      endpoint: endpoint,
      uid: uid,
      type: TYPE_RESPONSE,
      success: args[0] ? STATUS_ERROR : STATUS_SUCCESS,
      timestamp: toolbox.microtime(),
      session: getSession(),
      args: args
    };
    return response;
  };
  
  function applyRequestFilters(wsMessage) {
    if ( !requestFilters[wsMessage.endpoint] ) {
      return wsMessage;
    }
    requestFilters[wsMessage.endpoint].forEach(function(cb) {
      wsMessage = cb(wsMessage);
    });
    return wsMessage;
  };
  
  function onRequestMessage (wsMessage) {
    if ( ! ("endpoint" in wsMessage) ) {
      debug("websocket.protocol.remot: invalid wsMessage doesn't have endpoint");
      return ;
    }
    var args = wsMessage.args ? wsMessage.args : [];
    args.push(buildResponseCallback(wsMessage));
    
    applyRequestFilters(wsMessage);
    
    if ( ! (wsMessage.endpoint in endpoints) ) {
      debug("websocket.protocol.remot: unknown query ",wsMessage.endpoint);
      var response = buildResponseObject(
        wsMessage.uid, 
        wsMessage.endpoint, 
        [ERROR_ENDPOINT_NOT_FOUND]
      );
      return websocket.send(name, prepare(response));
    }
    endpoints[wsMessage.endpoint].apply(this, args);
  };
  
  function onResponseMessage (wsMessage) {
    var query = requests[wsMessage.uid];
    if ( !query ) {
      debug("Error: can't find query object for response: ",wsMessage);
      return ;
    }
    delete requests[wsMessage.uid];
    var args = wsMessage.args ? wsMessage.args : [];
    query.callback.apply(query, args);
  };

  function onEventMessage (wsMessage) {
    if ( ! ("endpoint" in wsMessage) ) {
      debug("invalid wsMessage doesn't have endpoint");
      return ;
    }
    var eventName = "remot:"+wsMessage.endpoint;
    var evtpubsub = pubsub.topic(eventName);
    evtpubsub.publish.apply(evtpubsub, wsMessage.args ? wsMessage.args : [] );
  };
  
  function onServerErrorMessage(wsMessage) {
    debug("Server error message ",wsMessage);
    pubsub.topic("remoterr").publish(wsMessage.error);
  };
  
  
  function sendEvent(eventName) {
    if ( !eventName ) {
      debug("ERROR: sendEvent: no event name given",arguments);
      return;
    }
    var args = Array.prototype.slice.call(arguments,0);
    var endpoint = args.shift();
    var uid = newUid();
    var request = new remotRequest(endpoint, uid, args);
    request.setTypeToEvent();
    request.send(function(){});
  };
  
  
  function remotRequest (endpoint, uid, args) {
    if ( arguments.length < 2) {
      throw "remotRequest: invalid constructor";
    }
    this.endpoint = endpoint;
    this.uid = uid;
    this.timestamp = toolbox.microtime();
    this.args = args ? args : [];
  };
  
  remotRequest.prototype.endpoint = null;
  remotRequest.prototype.uid = null;
  remotRequest.prototype.timestamp = null;
  remotRequest.prototype.args = [];
  remotRequest.prototype.type = TYPE_REQUEST;
  remotRequest.prototype.callback = null;
  remotRequest.prototype.setTypeToEvent = function() {
    this.type = TYPE_EVENT;
  };
  remotRequest.prototype.send = function(callback) {
    this.callback = callback;
    var query = {
      uid: this.uid,
      args: this.args,
      endpoint: this.endpoint,
      timestamp: this.timestamp,
      type: this.type,
      session: getSession()
    };
    requests[this.uid] = this;
    return websocket.send(name, prepare(query));
  };
    
  var remotProtocol = {
    prepare: prepare,
    onmessage: onmessage,
    name: name,
    addLocalEndPoint: addLocalEndPoint,
    addRemoteEndPoint: addRemoteEndPoint,
    addRequestFilter: addRequestFilter,
    sendEvent: sendEvent,
    SERVER_ERROR_NOPEER: SERVER_ERROR_NOPEER,
    SERVER_ERROR_BADAUTH: SERVER_ERROR_BADAUTH,
    ERROR_ENDPOINT_NOT_FOUND: ERROR_ENDPOINT_NOT_FOUND
  };
  
  return remotProtocol;
});