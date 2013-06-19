var d10 = require("../d10"),
  debug = d10.debug("d10:websocket-store");

function websocketStore() {
};

websocketStore.prototype.sockets = [];
websocketStore.prototype.usersLookup = {};
websocketStore.prototype.TYPE_SESSION = "session";
websocketStore.prototype.TYPE_REMOTE_CONTROL_SESSION = "remoteControlSession";

websocketStore.prototype.store = function (socket, user, type) {
  if ( type != this.TYPE_SESSION && type != this.TYPE_REMOTE_CONTROL_SESSION ) {
    debug("Invalid type ",type," for websocket");
    return false;
  }
  if ( !user ) {
    debug("Invalid user ",user," for websocket");
    return false;
  }
  debug("storing new socket, user=",user,", type=",type);
  socket.d10user = user;
  socket.d10type = type;
  socket.on('close', function() {
    this.remove(socket);
  }.bind(this));
  
  this.sockets.push(socket);
  if ( ! (user in this.usersLookup) ) {
    this.usersLookup[user] = [];
  }
  this.usersLookup[user].push(socket);
  return true;
};

websocketStore.prototype.remove = function(socket) {
  var sockets = this.sockets,
      usersLookup = this.usersLookup;
  function removeFromArray (a) {
    var index = a.indexOf(socket);
    if ( index < 0 ) {
      debug("WARNING: can't remove socket from array: socket not found");
      return false;
    }
    a.splice(index,1);
    return true;
  };
  
  function removeFromSockets () {
    return removeFromArray(sockets);
  };
  
  function removeFromUsersLookup() {
    var user = socket.d10user;
    if ( !user ) {
      debug("WARNING: socket don't have a d10user property. Can't remove from this.usersLookup");
      return false;
    }
    if ( ! (user in usersLookup) ) {
      debug("WARNING: user ",user," don't have this.usersLookup entry");
      return false;
    }
    return removeFromArray(usersLookup[user]);
  };
  
  var ssuccess = removeFromSockets();
  var usuccess = removeFromUsersLookup();
  return (ssuccess && usuccess);
};

websocketStore.prototype.findByUser = function(user) {
  if ( !(user in this.usersLookup) || !this.usersLookup[user].length ) {
    return [];
  }
  return this.usersLookup[user].slice(0);
};

websocketStore.prototype.findByFilter = function(filter) {
  return this.sockets.filter(filter);
};


exports = module.exports = new websocketStore();