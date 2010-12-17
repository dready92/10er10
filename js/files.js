var fs = require('fs');

exports.fileWriter = function(path) {
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
					console.log("buffer ? ", v instanceof Buffer );
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
					console.log(bc," bytes written");
					bytesWritten+=bc;
					inWrite = false;
				});
			}
// 			while ( buf.length ) {
// 				var data = buf.shift();
// 				var chunk = data.c;
// 				// 				console.log("sending buffer", chunk.length);
// 				(function(data){
// 					fs.write(descriptor,chunk,0,chunk.length,null,function(e,b) {
// 						if ( e ) {
// 							console.log("fileWriter::write - got an error",e);
// 							return ;
// 						}
// 						// 					console.log(b," bytes written");
// 						bytesWritten+=b;
// 					});
// 				})(data);
// 			}
			if ( !buf.length && close ) {
				fs.close(descriptor, function() { 
					console.log("write fd is closed");
				});
				if ( closeCallback ) { closeCallback.call(this, bytesWritten); }
				clearInterval(ival);
			}
		},300);
	};
		
};

exports.md5_file = function ( file, callback ) {
	var out = "",
	spawn  = require('child_process').spawn,
	md5    = spawn('md5sum', [file]);
	
	md5.stdout.on('data', function (data) { out+=data; });
	md5.stderr.on('data', function (data) { console.log('stderr: ' + data); });
	
	md5.on('exit', function (code) {  callback.call(this,out,code); });
};

