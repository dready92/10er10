(function(d10,$) {

d10.fn = d10.fn || {};

d10.fn.upload = function (ui) {
  var that = this;
  
  // load template
//   var ui=$('#upload');
  var $dropbox = $('div.uploadDropBox',ui);
  var audioTypes = ["audio/mp3","audio/ogg","video/ogg","audio/mpeg", "audio/x-flac","audio/flac"];
  var uploader = new uploadManager();
  var uploadCandidates = [];
  var intervalID = null;
//   ui.prepend($dropbox);
//   $('#main').append(ui);
  
  $("div.filesQueue",ui).delegate("button.close","click",function() {
    $(this).closest("div.fileWidget").remove();
  });

	$("a.video",ui).click(function() {
		launchVideo();
		return false;
	});
	$("div.video a",ui).click(function() {
		closeVideo();
		return false;
	});
  
  $dropbox.get(0).addEventListener("dragenter", dragenter, false);
  $dropbox.get(0).addEventListener("dragleave", dragleave, false);    
  $dropbox.get(0).addEventListener("dragover", dragover, false);  
  $dropbox.get(0).addEventListener("drop", drop, false);  

  function dragenter(e) {
    $dropbox.addClass("hover");
    e.stopPropagation();  
    e.preventDefault();  
  }  
    
  function dragover(e) {  
    e.stopPropagation();  
    e.preventDefault();  
  }  

  function dragleave (e) {
    $dropbox.removeClass("hover");
  }

  function drop(e) {  
    e.stopPropagation();  
    e.preventDefault();  
    $dropbox.removeClass("hover");
    var dt = e.dataTransfer;  
    var files = dt.files;  
    
    handleFiles(files);
  }  

  function handleFiles (files) {
    for (var i = 0; i < files.length; i++) {  
      var file = files[i];
//       console.log(file.name, file.size, file.type);
      var widget = $( d10.mustacheView("upload.file.widget") );
      $("div.head span.name",widget).text(file.name);
      $("div.head span.size",widget).text(file.size);
      $("div.head span.type",widget).text(file.type);
      $("button.review",widget).hide();
		$("span.progress",widget).hide();
		$("span.cancel span",widget).click(function() {
			var widget = $(this).closest("div.fileWidget");
			debug("cancel widget : ",widget, uploadCandidates);
			$.each(uploadCandidates,function(k,v) {
				if ( v && v.get(0) === widget.get(0) ) {
					uploadCandidates.splice(k,1);
					var f = widget.data('file');
					widget.removeData('file');
					f = null;
					widget.remove();
				}
			});
			return false;
		});
      widget.data('file',file);
	  //debug("file type: ",file.type);
	  //debug("file",file);
      var typeOK = false;
      for ( var index in audioTypes ) {
        if ( audioTypes[index] == file.type ) {
          typeOK = true;
        }
      }
      
      // fuckin osX does not know the mime type of flac files
      if ( file.name.match(/\.flac$/) ) {
		  typeOK = true;
	  }
      
      if ( typeOK ) {
        $("div.typeError",widget).hide();
        $("button.close",widget).hide();
        widget.data('status',0);
        uploadCandidates.push(widget);
        intervalID = setInterval(uploader.checkForUpload,2000);
      } else {
        widget.data('status',-1);
        $("div.controls",widget).hide();
      }
      $("div.filesQueue",ui).append(widget);
    }
  };

  function uploadManager () {
    // status : -1: won't upload, 0 = idle, 1 = uploading, 2 = uploaded
    var uploadMax = 2;
    function howManyAreUploading () {
      var current = 0;
      $("div.filesQueue div.fileWidget",ui).each (function() {
        if ( $(this).data('status') == 1 ) {
          current++;
        }
      });
      return current;
    }

    this.checkForUpload = function () {
//       console.log("check for upload", uploadCandidates);
      if ( !uploadCandidates.length ) {
        clearInterval( intervalID );
        intervalId = null;
      }
      if ( uploadCandidates.length && howManyAreUploading() < uploadMax ) {
        launchUpload( uploadCandidates.shift() );
      }
    }

	function launchUpload (widget) {
		var file = widget.data('file');
		var waitText = d10.mustacheView("upload.song.processing");
		widget.data("status",1);
	//       var url = site_url+'/api/song?'+$.d10param({"filesize": file.size, "filename": file.name } );
		$("span.cancel",widget).hide();
		$("span.progress",widget).show();
	  
		d10.rest.song.upload(file, file.name, file.size, {
			progress: function(e) { 
		// 		  debug("progress",e);
				if (e.lengthComputable) {
					var percentage = Math.round((e.loaded * 100) / e.total);
	// 				if ( percentage < 99 ) {
					$("div.controls span.progress",widget).html(percentage+'%');
	// 				} else {
	// 					$("div.controls span.progress",widget).hide();
	// 					$("div.controls span.status",widget).html(waitText);
	// 				}
				}  
			},
			end: function(e) {  
				debug("File transfer completed");
				$("div.controls span.progress",widget).hide();
				$("div.controls span.status",widget).html(waitText);
			},
			load: function() {
				widget.data("status",2);
				var back = null;
				try {
					back = JSON.parse(this.responseText);
				} catch (e) {
					back = {'status': 'error'};
				}
				$("button.close",widget).show();
				if ( back.status == "success" ) {
					$("div.controls span.status",widget).html(d10.mustacheView("upload.song.success"));
					$("button.review",widget).click(function() {
						var route = ["my", "review", back.data._id];
						d10.router.navigateTo( route );
					}).show();

				} else if ( back.data && back.data.code && back.data.code == 14 ) {
					$("div.controls span.progress",widget).hide();
					$("div.controls span.status",widget).html(d10.mustacheView("upload.song.alreadyindb"));
				} else {
					if ( back.data && back.data.message ) {
						$("div.controls span.progress",widget).hide();
						$("div.controls span.status",widget).html(back.data.message);
					} else {
						$("div.controls span.status",widget).html(d10.mustacheView("upload.song.serverError"));
					}
				}
			}
		}, function(){}); 
		$("div.controls span.status",widget).html(d10.mustacheView("upload.song.uploading"));
		}
}

	function launchVideo () {
		var container = $("div.center",ui).last();
		var x = $(window).width();
		var y = $(window).height();
		if ( x < 800 ) 	x=0;
		else			x = (x - 800) / 2;
		if ( y < 600 ) 	y=0;
		else			y = (y - 600) / 2;
				  
		$("div.control",container).hide();
		$("div.video",container).css({
			"position": "fixed",
			"width": 800,
			"height": 600,
			"top": y,
			"left": x
		}).show();
		var video = $("<video src=\"css/video/upload.ogv\" controls></video>").prependTo("div.video",container).one("ended",function() {
			closeVideo();
		})
		.one("canplaythrough",function() {
			debug("video canplaythrough");
			this.currentTime = 0;
		}).get(0).play();
	}

	function closeVideo() {
		var container = $("div.center",ui).last();
		$("div.control",container).show();
		$("div.video",container).hide().find("video").remove();
	};

};

})( window.d10 ? window.d10 : {}  , jQuery) ;

$(document).one("bootstrap:router",function() {
	var uploadRouteHandler = function() { this._activate("main","upload",this.switchMainContainer); };
	d10.upload = new d10.fn.upload($('#upload'));
	d10.router.route("upload","upload",uploadRouteHandler);
});

