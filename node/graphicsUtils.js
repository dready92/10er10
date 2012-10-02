var d10 = require("./d10"),
	gm = require("gm"),
	files = require("./files"),
	fs = require("fs");

var getResizeSize = function(size, newLength, onlyDownScale) {
  if ( onlyDownScale && size.width < newLength && size.height < newLength ) {
    return false;
  }
  if ( size.height > size.width ) {
    newH = newLength;
    newW = size.width / size.height * newH;
  } else {
    newW = newLength;
    newH = size.height / size.width * newW;
  }
  newH = Math.round(newH);
  newW = Math.round(newW);
  if ( !newH || !newW ) {
    return false;
  }
  
  return {width: newW, height: newH};
};

var splitFileAndExtension = function(filename) {
  var dotIndex = filename.lastIndexOf(".");
  if ( dotIndex < 0 ) {
    return false;
  }
  return {
    name: filename.substr(0,dotIndex),
    extension: filename.substr( (dotIndex+1) )
  };
};

var recordAlternateSizes = function (tmpfile, targetdir, targetfile, size, onOtherSizesWritten) {
  var jobs = [];
  var targetFileAndExtension = splitFileAndExtension(targetfile);
  if ( !targetFileAndExtension ) {
    return onOtherSizesWritten();
  }
  
  d10.config.images.sizeSteps.forEach(function(step) {
    var newSize = getResizeSize(size, step, true);
    if ( newSize ) {
      jobs.push (
        (function(newSize, step) {
          return function(then) {
            var targetfileName = exports.getAlternateFileName(targetfile, newSize);
            console.log("will record image ",targetfileName);
            gm(tmpfile)
              .resize(newSize.width,newSize.height)
              .write(targetdir+"/"+targetfileName,function(err) {
                  if ( err ) {
                      console.log("record image failed ",targetfileName);
                      return then("image manipulation error (writing modified image)");
                  }
                  console.log("will record image success ",targetfileName);
                  then(null, newSize, step);
              });
          };
        })(newSize, step)
      );
    }
  });
  
  if ( !jobs.length ) {
    return onOtherSizesWritten();
  }
  
  var available = {};
  
  var loopMe = function() {
    if ( !jobs.length ) {
      return onOtherSizesWritten(null, available);
    }
    var job = jobs.pop();
    job(function(err,resp, step) {
      if ( !err && resp && step ) {
        available[step] = resp;
      }
      loopMe();
    });
  };
  
  loopMe();
};

exports.getAlternateFileName = function(filename, size) {
  var targetFileAndExtension = splitFileAndExtension(filename);
  if ( !targetFileAndExtension ) {
    return false;
  }
  // somefile.250x245.jpg
  var targetfileName = targetFileAndExtension.name+
                      "."+
                      size.width+"x"+size.height+
                      "."+targetFileAndExtension.extension;
  return targetfileName;
};

exports.resizeImage = function (tmpfile, targetdir, targetfile, cb) {
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
			newH = d10.config.images.defaultSize;
			newW = size.width / size.height * newH;
		} else {
			newW = d10.config.images.defaultSize;
			newH = size.height / size.width * newW;
		}
		newH = Math.round(newH);
		newW = Math.round(newW);
		if ( !newH || !newW ) {
			cb("image manipulation error (new image size returns null)");
		}
// 						console.log("resizing image to ",newW,newH);

        var onOtherSizesWritten = function(err, sizes) {
          gm(tmpfile)
          .resize(newW,newH)
          .write(targetdir+"/"+targetfile,function(err) {
              if ( err ) {
                  return cb("image manipulation error (writing modified image)");
              }
  // 							console.log("image written to disk");
              cb(null, sizes);
          });
        };
        
        recordAlternateSizes(tmpfile, targetdir, targetfile, size, onOtherSizesWritten);
        
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
							d10.config.images.dir,
                            imgName,
							function(err, alternatives) {
								if ( err ) { return then(err); }
								return then(null, {
                                  filename: imgName, 
                                  sha1: sha1,
                                  alternatives: alternatives ? alternatives : null
                                });
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
