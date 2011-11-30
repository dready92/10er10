var d10 = require("./d10"),
	exec = require('child_process').exec,
	fs = require("fs"),
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

exports.id3tags = function(file,cb) {
	var stream = fs.createReadStream(file);
	var back = { ALBUM: "", ARTIST: "", TRACKNUMBER: "", TITLE: "", GENRE: "", DATE: "", PICTURES: [] };
	var cbCalled = false;
	stream.on("end",function() {
		console.log("["+file+"] debug id3tags : end of stream ");
		if ( !cbCalled ) {
			return cb(null,back);
		}
	});
	var parser = new musicmetadata(stream);
	parser.on('metadata', function(result) {
		console.log("["+file+"] debug id3tags: ");
		for ( var i in result ) {
			if ( i != "picture" ) {
				console.log(i,result[i]);
			}
		}
		if ( result.picture && Array.isArray(result.picture) && result.picture.length ) {
			console.log("this song got picture");
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
		console.log("["+file+"] debug id3tags done: ",err);
		if (err) {
			console.log("Got error decoding metadata: ",err);
			cbCalled = true;
			cb(err);
		}
	});
};
/*
exports.id3tags = function(file, cb, secondTry) {
	var utrac_opts = " -t UTF-8";
	if ( secondTry ) {
		utrac_opts += " -f LATIN1";
	}
	var tagsPipe = exec(d10.config.cmds.taginfo+" "+file+" | "+d10.config.cmds.utrac+utrac_opts,{maxBuffer: 2000*1024},function(err,stdout,stderr) {
		if ( err )	{
			if ( err.message.indexOf("error 303") > -1 ) {
				return cb(null,{});
			} else if ( !secondTry && err.message.indexOf("Command failed: Segmentation fault") > -1 ) {
				return exports.id3tags(file,cb,true);
			}
			return cb(null,{});
		}
		var tagnames = ['ALBUM','TRACK','ARTIST','TITLE','GENRE','YEAR'],
			tags = {};
		stdout.split("\n").forEach(function(v,k) {
			var tag = v.split("=",2);
			if ( tagnames.indexOf(tag[0]) >=0 ) {
				tags[tag[0]] = tag[1].replace(/^\s+/,"").replace(/\s+$/,"").replace(/"/g,"");
				if ( tag[0] == "TRACK" ) {
					tags["TRACKNUMBER"] = tags[tag[0]];
				} else if ( tag[0] == "YEAR" ) {
					tags["DATE"] = tags[tag[0]];
				}
			}
		});
		d10.log("debug",tags);
		cb(null,tags);
	});
};
*/
/*
exports.oggtags = function(file, cb) {
	var tagsPipe = exec(d10.config.cmds.vorbiscomment+" -l "+file+" | "+d10.config.cmds.utrac+" -t UTF-8",{maxBuffer: 2000*1024},function(err,stdout,stderr) {
		if ( err )	{
			if ( err.message.indexOf("error 303") > -1 ) {
				return cb(null,{});
			}
			return cb(err);
		}
		var tags = {};
		d10.log("debug","TAGS bruts: ",stdout);
		stdout.split("\n").forEach(function(v,k) {
			var tag = v.split("=",2);
			if ( tag.length > 1 ) {
				tags[tag[0]] = tag[1].replace(/^\s+/,"").replace(/\s+$/,"").replace(/"/g,"");
			}
		});
		d10.log("debug",tags);
		cb(null,tags);
	});
};
*/

exports.oggtags = exports.id3tags;
/*
exports.flactags = function(file,cb) {
	d10.log("launching flactags");
	var tagsPipe = exec(d10.config.cmds.metaflac+" --list "+file+" | grep -F comment[ | "+d10.config.cmds.utrac+" -t UTF-8",{maxBuffer: 2000*1024},function(err,stdout,stderr) {
		if ( err )	{
			d10.log("err",err);
			if ( err.message.indexOf("error 303") > -1 ) {
				return cb(null,{});
			}
			return cb(err);
		}
		var tags = {};
		d10.log("debug","TAGS bruts: ",stdout);
		stdout.split("\n").forEach(function(v,k) {
			var tagline = v.split(": ",2);
			d10.log("tagline: ",tagline);
			if ( tagline.length == 2 ) {
				var tag = tagline[1].split("=",2);
				if ( tag.length > 1 ) {
					tags[tag[0]] = tag[1].replace(/^\s+/,"").replace(/\s+$/,"").replace(/"/g,"");
				}
			}
		});
		d10.log("debug","FLAC tags");
		d10.log("debug",tags);
		cb(null,tags);
	});
};
*/
exports.flactags = exports.id3tags;

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
	var tagsPipe = exec(d10.config.cmds.vorbiscomment+" -s "+args.join(" ")+" "+file,function(err,stdout,stderr) {
		if ( err )	{
			return cb(err);
		}
		cb(null,tags);
	});
};
