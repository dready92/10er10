define( ["js/d10.imageUtils", "js/d10.osd", "js/d10.templates", "js/d10.rest", "js/config"], function(imageUtils, osd, tpl, rest, config) {
	

  var getSongsId = function(widget) {
    return widget.closest(".albumWidget").find(".list .song").map(function(k,v) { return $(this).attr("name"); }).get();
  };
  
	var albumImageUpload = function (image, file, api, canvas, songsId) {
// 		debug("Start of setting album image",image,file);
        var ids = songsId(canvas);

		rest.song.uploadImage(ids, file, file.name, file.size, {
			load: function(err, headers, body) {
				if ( err || !body || !body.filename ) {
// 						debug("image upload failed",err, body);
					if ( err == 403 ) {
						osd.send("error",tpl.mustacheView("my.review.error.forbidden"));
					} else {
						osd.send("error",tpl.mustacheView("my.review.error.filetransfert"));
					}
					canvas.after(image).remove();
// 						cb(false);
					return ;
				}
				osd.send("info",tpl.mustacheView("my.review.success.filetransfert",{filename: file.name}));
				var newImage = $("<img />").attr("src",imageUtils.getImageUrl(body.filename));
				canvas.after(newImage).remove();
				
			},
			progress: function(e) { 
				if (e.lengthComputable) {
					var percentage = Math.round((e.loaded * 100) / e.total);
					api.loadProgress(percentage);
				}  
			},
			end: function(e) {  
				api.loadProgress(100);
			}
		});
	};
	
	var albumImageRead = function(image, file, songsId) {
		var reader = new FileReader();
		reader.onload = function(e) {
			var canvas = $("<canvas />")
				.attr("width",config.img_size+"px")
				.attr("height",config.img_size+"px")
				.css({width: config.img_size, height: config.img_size, border: "1px solid #7F7F7F"});
			var api = canvas.loadImage(e, 
				{
					onReady: function() {
						image.after(canvas).remove();
						albumImageUpload(image, file, api, canvas, songsId);
					},
					onSize: function(w,h) {
						var ratio = imageUtils.getImageRatio(w,h);
						if ( ratio > 1.5 ) {
							osd.send("error",file.name+": "+tpl.mustacheView("my.review.error.imagesize"));
							canvas.remove();
							return false;
						}
						return true;
					}
				}
			);
		};
		reader.readAsDataURL(file);
	};
	
	function setListeners ( container, songsId ) {
        songsId = songsId || getSongsId;
		debug("Setting image uploader listeners on ",container);
		container.delegate(".dropbox", "dragenter",function (e) {
			$(this).addClass("hover");
			e.stopPropagation();
			e.preventDefault();
		})
		.delegate(".dropbox","dragover",function (e) {
			e.stopPropagation();
			e.preventDefault();
		})
		.delegate(".dropbox","dragleave",function (e) {
			$(this).removeClass("hover");
		})
		.delegate(".dropbox","drop",function (e) {
			e.stopPropagation();
			e.preventDefault();
			var that=$(this);
			that.removeClass("hover");
			var files = e.originalEvent.dataTransfer.files;
			if ( !files.length  ) { return ; }
			var file = files[0];
			if ( !imageUtils.isImage(file) ) { return ; }
			albumImageRead(that, file, songsId);
		});
	};
	
	return {
		setListeners: setListeners
	};
	
	
});
