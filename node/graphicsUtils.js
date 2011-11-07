var d10 = require("./d10"),
	gm = require("gm"),
	files = require("./files"),
	fs = require("fs");

 
exports.resizeImage = function (tmpfile, targetfile, cb) {
	gm(tmpfile).size(function(err,size) {
		if ( err ) {
			cb("image manipulation error (get image size failed)");
			return ;
		}
		if ( !size.width || !size.height ) {
			cb("image manipulation error (get image size returns null)");
		}
		var newH, newW;
		if ( size.height > size.width ) {
			newH = d10.config.images.maxSize;
			newW = size.width / size.height * newH;
		} else {
			newW = d10.config.images.maxSize;
			newH = size.height / size.width * newW;
		}
		newH = Math.round(newH);
		newW = Math.round(newW);
		if ( !newH || !newW ) {
			cb("image manipulation error (new image size returns null)");
		}
// 						console.log("resizing image to ",newW,newH);
		gm(tmpfile)
		.resize(newW,newH)
		.write(targetfile,function(err) {
			if ( err ) {
				return cb("image manipulation error (writing modified image)");
			}
// 							console.log("image written to disk");
			cb();
		});
	});
};

exports.imageFromMeta = function(meta, then) {
	if ( meta && meta.PICTURES && meta.PICTURES.length ) {
		var imgId = d10.uid();
		var imgName = imgId+"."+meta.PICTURES[0].format;
		var imgTmp = d10.config.images.tmpdir+"/"+imgName;
		fs.writeFile(imgTmp, meta.PICTURES[0].data, function(err,resp) {
			if ( err ) { then(err); }
			files.sha1_file(imgTmp, function(err,sha1) {
				if ( err ) { then(err); }
				sha1 = sha1.split(" ",2).shift();
				d10.couch.d10.view("images/sha1",{key: sha1}, function(err,view) {
					if ( err ) {return then(err);}
					if ( view.rows.length ) {
						return then(null, {filename: view.rows[0].value, sha1: sha1});
					} else {
						exports.resizeImage(
							imgTmp,
							d10.config.images.dir+"/"+imgName,
							function(err) {
								if ( err ) { return then(err); }
								return then(null, {filename: imgName, sha1: sha1});
							}
						);
					}
				});
			});
		});
	} else {
		then({message: "no picture"});
	}
};
