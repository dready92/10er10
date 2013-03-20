var wsServer = require('ws').Server;
exports = module.exports = function(httpServer) {
        
  var d10wsServer = new wsServer({server: httpServer});
  d10wsServer.on('connection'+"/websocket/test", function(ws) {
    var id = setInterval(function() {
      ws.send(JSON.stringify(process.memoryUsage()), function() { /* ignore errors */ });
    }, 10000);
    console.log('started client interval');
    ws.on('close', function() {
      console.log('stopping client interval');
      clearInterval(id);
    });
    ws.on('message', function(message) {
      console.log('received: %s', message);
    });
  });
};