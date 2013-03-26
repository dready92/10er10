var debug = require("debug")("websocket-request-mock");
var util = require('util');
var EventEmitter = require('events').EventEmitter;

/*
 * mandatory headers:
 *  host
 *  content-type
 */

var querystring = require("querystring");

function request ( webSocketData ) {
  EventEmitter.call(this);
  this.url = webSocketData.url;
  this.method = webSocketData.method;
  var qs = this.getQs(webSocketData.qs);
  if ( qs ) {
    this.url +="?"+qs;
  }
  this.headers = webSocketData.headers;
  this.body = webSocketData.body;
  process.nextTick(this.emitEvents.bind(this));
};
util.inherits(request, EventEmitter);


request.prototype.url=null;
request.prototype.ip = "websocket"; // for connect logger module
request.prototype.method = null;
request.prototype.httpVersion = "1.1";
request.prototype.httpVersionMajor = "1";
request.prototype.httpVersionMinor = "1";
request.prototype.setEncoding = function() {
  debug("setEncoding called");
};
request.prototype.getQs = function(qs) {
  return qs ? querystring.stringify(qs): null;
};
request.prototype.emitEvents = function() {
  if ( this.body ) {
    this.emit("data",this.body);
  }
  this.emit("end");
};

exports = module.exports = request;