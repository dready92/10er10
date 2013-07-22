define(["js/d10.websocket.protocol.remot",
       "js/d10.websocket",
       "js/d10.events"], 
       function (remot, websocket, pubsub) {

  var serverConnectionInterval = null;
  var lastServerConnectionErr = "init";
  var STATUS_OFF = "off";
  var STATUS_BADAUTH = remot.SERVER_ERROR_BADAUTH;
  var STATUS_NOPEER = remot.SERVER_ERROR_NOPEER;
  var STATUS_PEERED = "peered";
  var currentStatus = STATUS_OFF;
  var smallPlayStatusPubsub = pubsub.topic("remot:smallPlayStatus");
         
  function checkServerConnection() {
    remot.smallPlayStatus(function(err,resp) {
      if ( !err ) {
        smallPlayStatusPubsub.publish(resp);
      }
      
      if ( err == lastServerConnectionErr ) {
        return ;
      }
      if ( !err ) {
        debug("Everything's all right");
        lastServerConnectionErr = err;
        setStatus(STATUS_PEERED);
        return ;
      }
      if ( err == remot.SERVER_ERROR_BADAUTH ) {
        debug("Authentication failed");
        setStatus(STATUS_BADAUTH);
        lastServerConnectionErr = err;
      } else if ( err == remot.SERVER_ERROR_NOPEER || err == remot.ERROR_ENDPOINT_NOT_FOUND ) {
        debug("No peer connected");
        lastServerConnectionErr = err;
        setStatus(STATUS_NOPEER);
      } else {
        debug("real bad thing: the endpoint smallPlayStatus encountered an unknown error",err);
        throw "ERROR: smallPlayStatus unknown error";
      }
    });
  };
    
  function onSocketCreated() {
    debug("remot.master.connection, got onSocketCreated");
    if ( serverConnectionInterval ) {
      clearInterval(serverConnectionInterval);
    }
    serverConnectionInterval = setInterval(checkServerConnection, 5000);
  };

  function onSocketClosed() {
    debug("remot.master.connection, got socket:closed event");
    clearInterval(serverConnectionInterval);
    serverConnectionInterval = null;
    lastServerConnectionErr = STATUS_OFF;
    if ( currentStatus != STATUS_OFF ) {
      setStatus(STATUS_OFF);
    }
  }

  function status() {
    return currentStatus;
  };
  
  function setStatus (status) {
    debug("Change status: ",currentStatus,"=>",status);
    currentStatus = status;
    pubsub.topic("remot-connection").publish(status);
  };
    
  websocket.addProtocol(remot.name, remot.onmessage);
  pubsub.topic("websocket:created").subscribe(onSocketCreated);
  pubsub.topic("websocket:closed").subscribe(onSocketClosed);

  
  return {
    status: status,
    STATUS_BADAUTH: STATUS_BADAUTH,
    STATUS_NOPEER: STATUS_NOPEER,
    STATUS_OFF: STATUS_OFF,
    STATUS_PEERED: STATUS_PEERED
  };
});