var socketsBuffer = {};
var watchdogId = 1;
var socketsWithoutDataLimit = 100;

var installWatchdog = function(server) {
  server.on("connection", function(socket) {
    var remoteAddress = socket.remoteAddress;
    socket.d10watchdogId = watchdogId++;
//     console.log("connection", remoteAddress, socket.bytesRead);
    if ( ! (remoteAddress in socketsBuffer) ) {
      socketsBuffer[remoteAddress] = [];
    }
    
    freeSocketsOf(remoteAddress);
    
    socketsBuffer[remoteAddress].push(socket);
    socket.on("close", function() {
      removeSocketById(socket.d10watchdogId);
    });
  });
};

var removeSocketById = function(id) {
  if ( !id ) {
    console.log("id is undefined");
    return ;
  }
  for (var remoteAddress in socketsBuffer ) {
    for (var i=0; i<socketsBuffer[remoteAddress].length; i++) {
      if ( socketsBuffer[remoteAddress][i].d10watchdogId == id ) {
        socketsBuffer[remoteAddress].splice(i,1);
        return ;
      }
    }
  }
};

var freeSockets = function() {
  for (var i in socketsBuffer) {
    freeSocketsOf(i);
  }
};

var freeSocketsOf = function(remoteAddress) {
  if ( ! (remoteAddress in socketsBuffer) ) {
    return ;
  }
  if ( socketsBuffer[remoteAddress].length > socketsWithoutDataLimit ) {
    for (var i = 0; i < socketsWithoutDataLimit; i++) {
      var s = socketsBuffer[remoteAddress][i];
      if ( !s ) {
        continue;
      }
      if ( s.bytesRead < 5 ) {
        removeSocketById(s.d10watchdogId);
        s.end()
        s.destroy();
      }
    }
  }
};

var garbageBufferKeys = function() {
  for (var i in socketsBuffer ) {
    if ( !socketsBuffer[i].length ) {
      delete socketsBuffer[i];
    }
  }
}

setInterval(garbageBufferKeys,1000*60*60*12);

exports = module.exports = {
  install: installWatchdog,
  garbage: freeSockets
};