/* eslint-disable no-param-reassign */
const d10 = require('../d10');

const debug = d10.debug('d10:websocket-store');

class WebSocketStore {
  constructor() {
    this.sockets = [];
    this.usersLookup = {};
    this.TYPE_SESSION = 'session';
    this.TYPE_REMOTE_CONTROL_SESSION = 'remoteControlSession';
  }

  store(socket, user, type) {
    if (type !== this.TYPE_SESSION && type !== this.TYPE_REMOTE_CONTROL_SESSION) {
      debug('Invalid type ', type, ' for websocket');
      return false;
    }
    if (!user) {
      debug('Invalid user ', user, ' for websocket');
      return false;
    }
    const alreadyInStore = this.sockets.filter(s => s === socket);
    if (alreadyInStore.length) {
      debug('Socket already in store, not registering');
      return null;
    }
    debug('storing new socket, user=', user, ', type=', type);
    socket.d10user = user;
    socket.d10type = type;
    socket.on('close', () => {
      this.remove(socket);
    });

    this.sockets.push(socket);
    if (!(user in this.usersLookup)) {
      this.usersLookup[user] = [];
    }
    this.usersLookup[user].push(socket);
    return true;
  }

  remove(socket) {
    // eslint-disable-next-line prefer-destructuring
    const sockets = this.sockets;
    // eslint-disable-next-line prefer-destructuring
    const usersLookup = this.usersLookup;

    function removeFromArray(a) {
      const index = a.indexOf(socket);
      if (index < 0) {
        debug("WARNING: can't remove socket from array: socket not found");
        debug('Store size: ', sockets.length);
        return false;
      }
      a.splice(index, 1);
      return true;
    }

    function removeFromSockets() {
      return removeFromArray(sockets);
    }

    function removeFromUsersLookup() {
      const user = socket.d10user;
      if (!user) {
        debug("WARNING: socket don't have a d10user property. Can't remove from this.usersLookup");
        return false;
      }
      if (!(user in usersLookup)) {
        debug('WARNING: user ', user, " don't have this.usersLookup entry");
        return false;
      }
      return removeFromArray(usersLookup[user]);
    }

    const ssuccess = removeFromSockets();
    const usuccess = removeFromUsersLookup();
    return (ssuccess && usuccess);
  }

  findByUser(user) {
    if (!(user in this.usersLookup) || !this.usersLookup[user].length) {
      return [];
    }
    return this.usersLookup[user].slice(0);
  }

  findByFilter(filter) {
    return this.sockets.filter(filter);
  }
}


module.exports = new WebSocketStore();
