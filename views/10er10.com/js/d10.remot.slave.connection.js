define(["js/d10.websocket.protocol.remot",
       "js/d10.websocket",
       "js/d10.events"], 
       function (remot, websocket, pubsub) {

  var STATUS_OFF = "OFF";
  var STATUS_ON = "ON";
  var currentStatus = STATUS_OFF;
  var noPeerWatchDogId = null;
         
  function onSocketCreated() {
    debug("onSocketCreated");
    setTimeout(function() {
      remot.serverconnection(function() {
        debug("remot.serverconnection returns: ",arguments);
      });
    },5000);
  };

  function onSocketClosed() {
    setStatus(STATUS_OFF);
  }

  function status() {
    return currentStatus;
  };
  
  function setStatus (status) {
    currentStatus = status;
    pubsub.topic("remot-connection").publish(status);
  };
  
  
  function peerWatchdog () {
    noPeerWatchDogId = null;
    setStatus(STATUS_OFF);
  };
  
  websocket.addProtocol(remot.name, remot.onmessage);
  pubsub.topic("websocket:created").subscribe(onSocketCreated);
  pubsub.topic("websocket:closed").subscribe(onSocketClosed);
  
  remot.addRemoteEndPoint("serverconnection");
  remot.addLocalEndPoint("serverconnection", function() {
    debug("remot.slave: got a PEER serverconnection request");
    if ( noPeerWatchDogId ) {
      clearTimeout(noPeerWatchDogId);
    }
    noPeerWatchDogId = setTimeout(peerWatchdog, 30000);
    
    var callback = arguments[ (arguments.length -1) ];
    callback(remot.ERROR_ENDPOINT_NOT_FOUND);
    if ( currentStatus != STATUS_ON ) {
      debug("RemoteControl started !");
      setStatus(STATUS_ON);
    }
  });
  
  setTimeout(function() {
    if ( websocket.socketReady() ) {
      debug("starting onSocketCreated manually");
      onSocketCreated();
    }else {
      debug("websocket is not ready");
    }
  },1000);
  
  return {
    status: status,
    STATUS_OFF: STATUS_OFF,
    STATUS_ON: STATUS_ON
  };
});