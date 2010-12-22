var fs = require('fs'),
	events = require("events"),
	spawn = require("child_process").spawn;

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
	var inWrite = false;
	this.open = function() {
		pipe = spawn(cmd,args);
		pipe.stdout.on("data",function(chunk) { that.emit("stdout",chunk);});
		pipe.stderr.on("data",function(chunk) { that.emit("stderr",chunk);console.log("emit stderr",chunk);});
		pipe.on("exit",function(code) {exitcode = code;});
		fireInterval();
		this.open = function() {console.log("streamWriter open has already been called once");};
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
			if ( inWrite )	return ;
// 			console.log("buf length ? ",buf.length, " close ? ",close);
			if ( buf.length ) {
// 				console.log("buf : ",buf);
// 				console.log("buf: ", typeof buf);
				var size = 0;
				buf.forEach(function(v,k) { size+=v.length; });
				var b = new Buffer(size);
				var offset = 0;
				
				buf.forEach(function(v,k) {
					v.copy(b,offset,0,v.length);
					offset +=v.length;
				});
				buf = [];
				inWrite = true;
				pipe.stdout.on("drain",function() {
						console.log("stream drain event");
						bytesWritten+=bc;
						inWrite = false;
						that.emit("data",b);
				});
				console.log(cmd,"writing to pipe");
				pipe.stdin.write(b);
				
			} else if ( close ) {
				pipe.stdin.end();
				var close = function(code) {
					console.log("process exited"); 
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
				console.log("fileWriter::open - got an error");
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
// 			console.log("buf length ? ",buf.length, " close ? ",close);
			if ( buf.length ) {
// 				console.log("buf : ",buf);
// 				console.log("buf: ", typeof buf);
				var size = 0;
				buf.forEach(function(v,k) { size+=v.length; });
				
				var b = new Buffer(size);
				var offset = 0;
				
				buf.forEach(function(v,k) {
// 					console.log("buffer ? ", v instanceof Buffer );
					v.copy(b,offset,0,v.length);
					offset +=v.length;
				});
				buf = [];
				inWrite = true;
				fs.write(descriptor,b,0,b.length,null,function(e,bc) {
					if ( e ) {
						console.log("fileWriter::write - got an error",e);
						inWrite = false;
						return ;
					}
					bytesWritten+=bc;
					inWrite = false;
					that.emit("data",b);
				});
			} else if (  close ) {
				fs.close(descriptor, function() { 
					console.log("write fd is closed"); 
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


exports.md5_file = function ( file, callback ) {
	var out = "",
	spawn  = require('child_process').spawn,
	md5    = spawn('md5sum', [file]);
	
	md5.stdout.on('data', function (data) { out+=data; });
	md5.stderr.on('data', function (data) { console.log('stderr: ' + data); });
	
	md5.on('exit', function (code) {  callback.call(this,out,code); });
};
