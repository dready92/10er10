/* eslint-disable no-plusplus */
const d10 = require('./d10');

const debug = d10.debug('d10:dosWatchdog');
const socketsBuffer = {};
let watchdogId = 1;
const socketsWithoutDataLimit = 100;

function installWatchdog(server) {
  server.on('connection', (socket) => {
    const { remoteAddress } = socket;
    // eslint-disable-next-line no-param-reassign,no-plusplus
    socket.d10watchdogId = watchdogId++;
    if (!(remoteAddress in socketsBuffer)) {
      socketsBuffer[remoteAddress] = [];
    }

    freeSocketsOf(remoteAddress);

    socketsBuffer[remoteAddress].push(socket);
    socket.on('close', () => {
      removeSocketById(socket.d10watchdogId);
    });
  });
}

function removeSocketById(id) {
  if (!id) {
    debug('id is undefined');
    return;
  }

  const remoteAddresses = Object.keys(socketsBuffer);
  for (let i = 0; i < remoteAddresses.length; i++) {
    const addr = remoteAddresses[i];
    for (let j = 0; j < socketsBuffer[addr].length; j++) {
      if (socketsBuffer[addr][j].d10watchdogId === id) {
        socketsBuffer[addr].splice(j, 1);
        return;
      }
    }
  }
}

function freeSockets() {
  Object.keys(socketsBuffer).forEach(i => freeSocketsOf(i));
}

function freeSocketsOf(remoteAddress) {
  if (!(remoteAddress in socketsBuffer)) {
    return;
  }
  if (socketsBuffer[remoteAddress].length > socketsWithoutDataLimit) {
    for (let i = 0; i < socketsWithoutDataLimit; i++) {
      const s = socketsBuffer[remoteAddress][i];
      if (!s) {
        // eslint-disable-next-line no-continue
        continue;
      }
      if (s.bytesRead < 5) {
        removeSocketById(s.d10watchdogId);
        s.end();
        s.destroy();
      }
    }
  }
}

function garbageBufferKeys() {
  Object.keys(socketsBuffer).forEach((i) => {
    if (!socketsBuffer[i].length) {
      delete socketsBuffer[i];
    }
  });
}

setInterval(garbageBufferKeys, 1000 * 60 * 60 * 12);

module.exports = {
  install: installWatchdog,
  garbage: freeSockets,
};
