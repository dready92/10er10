const { Server } = require('ws');
const { garbage } = require('../dosWatchdog');

const Router = require('./websocket-router');
const PevtsProtocol = require('./websocket-protocol-pevts');
const RemoteProtocol = require('./websocket-protocol-remot');


class WebsocketServer {
  constructor(httpServer, d10Server) {
    this.router = null;
    let wsId = 1;
    const d10wsServer = new Server({ server: httpServer });
    this.createRouter();
    this.registerProtocols(httpServer, d10Server);
    d10wsServer.on('connection', (ws) => {
      // eslint-disable-next-line no-param-reassign,no-plusplus
      ws.d10id = wsId++;
      this.bindWebSocketListeners(ws);
    });

    d10wsServer.on('error', (err) => {
      if (err.errno === 'EMFILE') {
        garbage();
      } else {
        throw err;
      }
    });
  }

  createRouter() {
    this.router = new Router();
  }

  registerProtocols(httpServer, d10Server) {
    this.registerPevtsProtocol(httpServer, d10Server);
    this.registerRemotProtocol(httpServer, d10Server);
  }

  registerPevtsProtocol(httpServer, d10Server) {
    const pevtsProtocolInstance = new PevtsProtocol(httpServer, d10Server);
    this.router.addType(pevtsProtocolInstance.name, pevtsProtocolInstance.handler);
  }

  registerRemotProtocol(httpServer, d10Server) {
    const remotProtocolInstance = new RemoteProtocol(httpServer, d10Server);
    this.router.addType(remotProtocolInstance.name, remotProtocolInstance.handler);
  }

  bindWebSocketListeners(ws) {
    ws.on('message', (message) => {
      this.router.route(message, ws);
    });
  }
}

module.exports = WebsocketServer;
