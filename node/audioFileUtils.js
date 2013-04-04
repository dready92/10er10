var d10 = require("./d10"),
	exec = require('child_process').exec,
	fs = require("fs"),
	debug = d10.debug("d10:audioFileUtils"),
	musicmetadata = require("musicmetadata");

exports.oggLength = function(file,cb) {
	var ogginfo = exec(d10.config.cmds.ogginfo+" "+file,{maxBuffer: 2000*1024},function(err,stdout,stderr) {
		if ( stdout.length ) {
			var back = stdout.match(/Playback length: ([0-9]+)m:([0-9]+)/);
			if ( !back ) {
				cb("no match");
				return ;
			}
			if ( back.length > 2 ) {
				return cb(null,back);
			}
		}
		if ( err !== null ) {
			cb(err);
		} else {
			cb("no match");
		}
	});
};

exports.extractTags = function(file,cb) {
	var stream = fs.createReadStream(file);
	var back = { ALBUM: "", ARTIST: "", TRACKNUMBER: "", TITLE: "", GENRE: "", DATE: "", PICTURES: [] };
	var cbCalled = false;
	stream.on("end",function() {
		debug("["+file+"] debug id3tags : end of stream ");
		if ( !cbCalled ) {
			return cb(null,back);
		}
	});
	var parser = new musicmetadata(stream);
	parser.on('metadata', function(result) {
		debug("["+file+"] debug id3tags: ");
		for ( var i in result ) {
			if ( i != "picture" ) {
				debug(i,result[i]);
			}
		}
		if ( result.picture && Array.isArray(result.picture) && result.picture.length ) {
			debug("this song got picture");
		}
		
		if ( result.artist && Array.isArray(result.artist) && result.artist.length ) {
			back.ARTIST = result.artist.pop();
		}
		if ( result.title ) {
			back.TITLE = result.title;
		}
		if ( result.album ) {
			back.ALBUM = result.album;
		}
		if ( result.track && result.track.no ) {
			back.TRACKNUMBER = result.track.no;
		}
		if ( result.genre && Array.isArray(result.genre) && result.genre.length ) {
			back.GENRE = result.genre.pop();
		}
		if ( result.year ) {
			back.DATE = result.year;
		}
		if ( result.picture && Array.isArray(result.picture) && result.picture.length ) {
			back.PICTURES = result.picture;
		}
		cbCalled = true;
		return cb(null,back);
	});
	parser.on('done', function(err) {
		debug("["+file+"] debug id3tags done: ",err);
		if (err) {
			debug("Got error decoding metadata: ",err);
			cbCalled = true;
			cb(err);
		}
	});
};

exports.escapeShellArg = function(s) {
	return "'"+s.replace(/'/g, "'\\''")+"'";
};

exports.setOggtags = function(file, tags, cb) {
	if ( !d10.count(tags) ) {
		return cb(null,tags);
	}
	var args = [];
	for ( var index in tags ) {
		args.push("-t "+exports.escapeShellArg(index+"="+tags[index]));
	}
	var tagsPipe = exec(d10.config.cmds.vorbiscomment+" -w "+args.join(" ")+" "+file,function(err,stdout,stderr) {
		if ( err )	{
			return cb(err);
		}
		cb(null,tags);
	});
};
