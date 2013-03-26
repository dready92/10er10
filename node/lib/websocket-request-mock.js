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

/*
 * 
  var wsReq = require("./lib/websocket-request-mock");
  var wsResp = require("./lib/websocket-response-mock");
  
  
  var req = new wsReq({
    headers: {host: "localhost",
    "cookie":"doBadThings=%7B%22user%22%3A%22test2%22%2C%22session%22%3A%221ntlb8o3mj2hs72p167uf%22%7D",
    "content-type": "application/www-urlencoded"},
    url: "/api/genres/available",
    method: "GET"
  });
  
  var resp = new wsResp("1");
  d10Server.handle(req,resp);
  */