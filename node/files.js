var fs = require('fs'),
	events = require("events"),
	stream = require("stream"),
	util = require("util"),
	spawn = require("child_process").spawn;
// 	d10 = require("./d10");
	
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
// 				d10.log("debug","fileWriter::open - got an error");
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
			if ( buf.length ) {
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
// 						d10.log("debug","fileWriter::write - got an error",e);
						inWrite = false;
						return ;
					}
					bytesWritten+=bc;
					inWrite = false;
					that.emit("data",b);
				});
			} else if (  close ) {
				fs.close(descriptor, function() { 
// 					d10.log("debug","write fd is closed"); 
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
// 	md5.stderr.on('data', function (data) { d10.log("debug",'stderr: ' + data); });
	
	md5.on('exit', function (code) {  callback.call(this,out,code); });
};


exports.sha1_file = function ( file, callback ) {
	var out = "",
	spawn  = require('child_process').spawn,
	sha1    = spawn('sha1sum', [file]);
	
	sha1.stdout.on('data', function (data) { out+=data; });
// 	sha1.stderr.on('data', function (data) { d10.log("debug",'stderr: ' + data); });
	sha1.on('exit', function (code) {  callback(code,out.replace(/\s+$/,"")); });
};


exports.fileCache = function(options) {
	var cache = {
		files: {},
		stats: {}
	};
	
	var settings = { bypass: false };
	for ( var index in options ) { settings[index] = options[index]; }
	
	var cacheEntry = function(data ) {
		return { data: data, timestamp: new Date().getTime()
		};
	};
	console.log("Bypass : ",settings.bypass);
	var cachedReadStream = function(data) {
		var pause = true;
		var d = data.slice();
		var that = this;
		this.setEncoding = function(){};
		this.readable = true;
		this.destroy = function(){};
		this.pause = function() { pause = true; };
		this.resume = function() { pause = false; process.nextTick(sendOne); };
		var sendOne = function() {
			if ( pause )	return ;
			if ( d.length ) { 
				that.emit("data",d.shift()); 
				if ( d.length ) return process.nextTick(sendOne);
				that.emit("end");
				that.emit("close");
			}
		};
		this.resume();
	};
	util.inherits(cachedReadStream, stream.Stream);
	
	var dupReadStream = function(file,key,options) {
		var stream = fs.createReadStream(file,options);
		if ( settings.bypass )	return stream;
		var data = [];
		stream.on("data",function(d) { data.push(d); });
		stream.on("close",function() { cache.files[key] = cacheEntry(data) });
		return stream;
	};
	
	return {
		createReadStream: function(file,options) {
			options = options || {};
			var key = file;
			if ( options.start ) {key+= "^s"+options.start;}
			if ( options.end ) {key+= "^e"+options.end;}
			if ( cache.files[key] ) {
				console.log("file ",key," served from cache",settings.bypass);
				return new cachedReadStream(cache.files[key].data);
			}	else {
				return dupReadStream(file,key,options);
			}
		},
		stat: function(file,then) {
			if ( cache.stats[file] ) {
// 				d10.log("filestat ",file," served from cache");
				then.apply(this,cache.stats[file].data);
				return ;
			}
			fs.stat(file,function() {
				var entry = cacheEntry(Array.prototype.slice.call(arguments));
				then.apply(this,entry.data);
				if ( !settings.bypass ) {
					cache.stats[file] = entry;
				}
			});
		},
		readFile: function(file,e,c) {
			var callback = c ? c : e ;
			if ( !cache.files[file] ) {
				var then = function(err,data) {
					process.nextTick(function() {
						callback.call(this,err,data);
					});
					if ( !settings.bypass ) {
						console.log("setting cache for ",file);
						cache.files[file] = cacheEntry({data: data, err: err});
					}
					
				};
				if ( c )	fs.readFile(file,e,then);
				else		fs.readFile(file,then);
			} else {
				process.nextTick(function() {
					console.log("file served from cache");
					callback.call(this,cache.files[file].data.err, cache.files[file].data.data);
				});
			}
		},
		getCache: function() {return cache}
	};
		
};


exports.writeStream = function(stream, filename, then) {
	var writer = fs.createWriteStream( filename );
	writer.on("close",then);
	writer.on("error",then);
	stream.pipe(writer);
};