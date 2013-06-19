define(["js/d10.websocket.protocol.remot",
       "js/d10.websocket",
       "js/d10.events"], 
       function (remot, websocket, pubsub) {

  var serverConnectionInterval = null;
  var lastServerConnectionErr = null;
  var STATUS_OFF = "off";
  var STATUS_BADAUTH = remot.SERVER_ERROR_BADAUTH;
  var STATUS_NOPEER = remot.SERVER_ERROR_NOPEER;
  var STATUS_PEERED = "peered";
  var currentStatus = STATUS_OFF;
         
  function checkServerConnection() {
    remot.serverconnection(function(err,resp) {
      debug("serverconnection returns");
      debug("err = ",err,", lastServerConnectionErr = ", lastServerConnectionErr);
      if ( !err ) {
        debug("real bad thing: the endpoint serverconnection succeded");
        throw "ERROR: serverconnection succeded";
      }
      if ( err == lastServerConnectionErr ) {
        return ;
      }
      if ( err == remot.SERVER_ERROR_BADAUTH ) {
        debug("Authentication failed");
        setStatus(STATUS_BADAUTH);
        lastServerConnectionErr = err;
      } else if ( err == remot.SERVER_ERROR_NOPEER ) {
        debug("No peer connected");
        lastServerConnectionErr = err;
        setStatus(STATUS_NOPEER);
      } else {
        debug("Everything's all right");
        lastServerConnectionErr = err;
        setStatus(STATUS_PEERED);
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
    lastServerConnectionErr = null;
    setStatus(STATUS_OFF);
  }

  function status() {
    return currentStatus;
  };
  
  function setStatus (status) {
    currentStatus = status;
    pubsub.topic("remot-connection").publish(status);
  };
    
  websocket.addProtocol(remot.name, remot.onmessage);
  pubsub.topic("websocket:created").subscribe(onSocketCreated);
  pubsub.topic("websocket:closed").subscribe(onSocketClosed);
  remot.addRemoteEndPoint("serverconnection");
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
    STATUS_BADAUTH: STATUS_BADAUTH,
    STATUS_NOPEER: STATUS_NOPEER,
    STATUS_OFF: STATUS_OFF,
    STATUS_PEERED: STATUS_PEERED
  };
});