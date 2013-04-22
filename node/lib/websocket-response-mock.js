var debug = require("debug")("d10:websocket-response-mock");
var util = require('util');
var EventEmitter = require('events').EventEmitter;

function response(uuid,callback) {
  EventEmitter.call(this);
  this.uuid = uuid;
  this.callback = callback;
};

util.inherits(response, EventEmitter);

response.prototype.uuid = null;
response.prototype.statusCode = null;
response.prototype.statusMessage = null;
response.prototype.headers = {};
response.prototype.body = "";
response.prototype.writeHead = function(code, reason, headers) {
    if ( !headers && reason ) {
      headers = reason;
      reason = null;
    }
    this.statusCode = code;
    if ( headers ) {
      this.headers = headers;
    }
    if ( reason ) {
      this.reason = reason;
    }
  };
response.prototype.write = function(chunk) {
    if ( chunk ) {
      this.body += chunk;
    }
  };
response.prototype.end = function(chunk) {
    this.write(chunk);
    debug("should send websocket response");
    debug("response code: "+this.statusCode);
    debug("response body: "+this.body);
    this.callback(this.statusCode, this.statusMessage, this.body);
  };
response.prototype.setHeader = function(name, value) {
    debug("setting header "+name+" to "+value);
    this.headers[name] = value;
  };

response.prototype.getHeader = function(name) {
  return this.headers[name];
};
  
response.prototype._implicitHeader = function() {
  this.writeHead(this.statusCode);
};

exports = module.exports = response;