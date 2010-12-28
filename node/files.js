var fs = require('fs'),
	events = require("events"),
	spawn = require("child_process").spawn,
	d10 = require("./d10");

var streamWriter = exports.streamWriter = function(cmd, args) {
	events.EventEmitter.call(this);
	
	var that = this;
	
	var ival = false;
	var	buf = [];
	var pipe = null;
	var close = false;
	var closeCallback = null;
	var bytesWritten = 0;
	var exitcode = -1;
	var free = true;
	this.open = function() {
		pipe = spawn(cmd,args);
		pipe.stdout.on("data",function(chunk) { that.emit("stdout",chunk);});
		pipe.stderr.on("data",function(chunk) { that.emit("stderr",chunk);d10.log("emit stderr",chunk);});
		
		pipe.on("exit",function(code) {exitcode = code;});
		fireInterval();
		this.open = function() {d10.log("debug","streamWriter open has already been called once");};
	};
	
	this.abort = function () {
		if ( pipe ) { pipe.kill(); }
		buf= [];
		this.write = function(){buf=[];};
	};
	
	this.close = function(callback) {
		close = true;
		closeCallback = callback;
	};
	
	this.write = function(chunk) { buf.push(chunk); };
	
	this.bytesWritten = function() { return bytesWritten; };
	
	var fireInterval = function() {
// 		if ( !pipe )	return ;
		ival = setInterval(function() {
			if ( !free )	return ;
// 			d10.log("debug","buf length ? ",buf.length, " close ? ",close);
			if ( buf.length ) {
// 				d10.log("debug","buf : ",buf);
// 				d10.log("debug","buf: ", typeof buf);
				var packets = 5;
				var toSend = buf.splice(0, buf.length < packets ? buf.length : packets);
				var size = 0;
				toSend.forEach(function(v,k) { size+=v.length; });
				var b = new Buffer(size);
				var offset = 0;
				
				toSend.forEach(function(v,k) {
					v.copy(b,offset,0,v.length);
					offset +=v.length;
				});
// 				buf = [];
// 				inWrite = true;
// 				var b = buf.shift();
				d10.log("debug",cmd,"writing to pipe");
				free = pipe.stdin.write(b);
				if ( !free ) {
					(function(bc) {
						pipe.stdout.once("drain",function() {
							d10.log("debug","stream drain event");
							bytesWritten+=bc;
							free = true;
							that.emit("data",b);
						});
					})(b.length);
				} else {
					d10.log("debug","stream drain event");
					bytesWritten+=b.length;
					that.emit("data",b);
				}
			} else if ( close ) {
				pipe.stdin.end();
				var close = function(code) {
					d10.log("debug","process exited"); 
					if ( closeCallback ) { closeCallback.call(this, bytesWritten); }
					clearInterval(ival);
					that.emit("end");
				};
				if ( exitcode >= 0 ) {
					close(exitcode);
				} else {
					pipe.on("exit",close);
				}
			}
		},100);
	};
		
};

// inherit events.EventEmitter
exports.streamWriter.super_ = events.EventEmitter;
exports.streamWriter.prototype = Object.create(events.EventEmitter.prototype, {
    constructor: {
        value: streamWriter,
        enumerable: false
    }
});


	
var fileWriter = exports.fileWriter = function(path) {
	events.EventEmitter.call(this);
	
	var that = this;
	
	var ival = false;
	var	buf = [];
	var descriptor = null;
	var close = false;
	var closeCallback = null;
	var bytesWritten = 0;
	var inWrite = false;
	this.open = function() {
		fs.open(path, "w" , "0644", function(err,fd) {
			if ( err ) {
				d10.log("debug","fileWriter::open - got an error");
				return ;
			}
			descriptor = fd;
			fireInterval();
		});
	};
	
	this.abort = function () {
		if ( descriptor ) {
			fs.close(descriptor);
			descriptor = null;
		}
	};
	
	this.close = function(callback) {
		close = true;
		closeCallback = callback;
	};
	
	this.write = function(chunk) { buf.push(chunk); };
	
	this.bytesWritten = function() { return bytesWritten; };
	
	var fireInterval = function() {
		if ( !descriptor )	return ;
		ival = setInterval(function() {
			if ( inWrite )	return ;
// 			d10.log("debug","buf length ? ",buf.length, " close ? ",close);
			if ( buf.length ) {
// 				d10.log("debug","buf : ",buf);
// 				d10.log("debug","buf: ", typeof buf);
				var size = 0;
				buf.forEach(function(v,k) { size+=v.length; });
				
				var b = new Buffer(size);
				var offset = 0;
				
				buf.forEach(function(v,k) {
// 					d10.log("debug","buffer ? ", v instanceof Buffer );
					v.copy(b,offset,0,v.length);
					offset +=v.length;
				});
				buf = [];
				inWrite = true;
				fs.write(descriptor,b,0,b.length,null,function(e,bc) {
					if ( e ) {
						d10.log("debug","fileWriter::write - got an error",e);
						inWrite = false;
						return ;
					}
					bytesWritten+=bc;
					inWrite = false;
					that.emit("data",b);
				});
			} else if (  close ) {
				fs.close(descriptor, function() { 
					d10.log("debug","write fd is closed"); 
					if ( closeCallback ) { closeCallback.call(this, bytesWritten); }
					clearInterval(ival);
					that.emit("end");
				});
					
			}
		},100);
	};
		
};
// inherit events.EventEmitter
exports.fileWriter.super_ = events.EventEmitter;
exports.fileWriter.prototype = Object.create(events.EventEmitter.prototype, {
    constructor: {
        value: fileWriter,
        enumerable: false
    }
});

exports.bufferSum = function(buffers) {
	var size = 0,offset = 0,b;
	buffers.forEach(function(v,k) { size+=v.length; });
	b = new Buffer(size);
	buffers.forEach(function(v,k) {
		v.copy(b,offset,0,v.length);
		offset +=v.length;
	});
	return b;
};

exports.md5_file = function ( file, callback ) {
	var out = "",
	spawn  = require('child_process').spawn,
	md5    = spawn('md5sum', [file]);
	
	md5.stdout.on('data', function (data) { out+=data; });
	md5.stderr.on('data', function (data) { d10.log("debug",'stderr: ' + data); });
	
	md5.on('exit', function (code) {  callback.call(this,out,code); });
};


exports.sha1_file = function ( file, callback ) {
	var out = "",
	spawn  = require('child_process').spawn,
	sha1    = spawn('sha1sum', [file]);
	
	sha1.stdout.on('data', function (data) { out+=data; });
	sha1.stderr.on('data', function (data) { d10.log("debug",'stderr: ' + data); });
	sha1.on('exit', function (code) {  callback(code,out.replace(/\s+$/,"")); });
};
