define(["js/domReady", "js/d10.templates", "js/d10.router", "js/d10.rest", "js/d10.events"], 
       function(foo, tpl, router, rest, pubsub) {

	function uploadCtrl (ui) {
		var that = this;
		
		var $dropbox = $('div.uploadDropBox',ui);
		var audioTypes = ["audio/mp3","audio/ogg","video/ogg","audio/mpeg", "audio/x-flac","audio/flac", "audio/x-m4a"];
		var uploader = new uploadManager();
		var uploadCandidates = [];
		var intervalID = null;
        var songProcessorTopic = pubsub.topic("song-processor");
		
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
			var widget = $( tpl.mustacheView("upload.file.widget") );
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
				var waitText = tpl.mustacheView("upload.song.processing");
				widget.data("status",1);
				$("span.cancel",widget).hide();
				$("span.progress",widget).show();
			
				rest.song.upload(file, file.name, file.size, {
					progress: function(e) {
						if (e.lengthComputable) {
							var percentage = Math.round((e.loaded * 100) / e.total);
							$("div.controls span.progress",widget).html(percentage+'%');
							if ( percentage == 100 ) {
								$("div.controls span.progress",widget).hide();
								$("div.controls span.status",widget).html(waitText);
							}
						}  
					},
					end: function(e) {  
						debug("File transfer completed");
						$("div.controls span.progress",widget).hide();
						$("div.controls span.status",widget).html(waitText);
					},
					load: function(code,headers,body) {
						var back = null;
						try {
							back = JSON.parse(body);
						} catch (e) {
							back = {'status': 'error'};
						}
						if ( code == 200 &&
                            back.status && back.status == "uploadEnd" ) {
                          songUploadEnd(widget, back);
                        } else {
                          songEncodingEnd(widget, code, back);
						}
					},
					error: function() {
						widget.data("status",2);
						$("div.controls span.progress",widget).hide();
						$("div.controls span.status",widget).html(tpl.mustacheView("upload.song.serverError"));
					}
				}, function(){}); 
                $("div.controls span.status",widget).html(tpl.mustacheView("upload.song.uploading"));
                
                
            }
		}
		
        function songEncodingEnd(widget, code, response) {
          widget.data("status",2);
          widget.find("button.close").show();
          widget.find("div.controls span.progress").hide();
          if ( code == 200 ) {
            widget.find("div.controls span.status").html(tpl.mustacheView("upload.song.success"));
            widget.find("button.review").click(function() {
                var route = ["my", "review", response._id];
                router.navigateTo( route );
            }).show();
          } else if ( code == 433 ) {
            widget.find("div.controls span.status").html(tpl.mustacheView("upload.song.alreadyindb"));
          } else {
            if ( response.message ) {
              widget.find("div.controls span.status").html(response.message);
            } else {
              widget.find("div.controls span.status").html(tpl.mustacheView("upload.song.serverError"));
            }
          }
        };
        
        function songUploadEnd(widget, response) {
          widget.attr("name",response.id);
          widget.find("div.controls span.progress").empty().show();
          widget.find("div.controls span.status").html("Encoding... ");
        };

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
        songProcessorTopic.subscribe("song-processor",function(message) {
          if ( !("songId" in message) ) {
            debug("no songId in message",message);
            return ;
          }
          var widget = ui.find(".fileWidget[name="+message.songId+"]");
          if ( ! widget.length ) {
            debug("songId widget not found",message.songId);
            return ;
          }
          if ( message.event == "song-processor:progress" ) {
            var pct = parseInt( 100/message.total*message.complete, 10);
            widget.find("div.controls span.progress").html(pct+'%');
            return ;
          }
          if ( message.event == "song-processor:end" ) {
            songEncodingEnd(widget, message.code, message.data);
          }
        });
	};

	var uploadRouteHandler = function() { this._activate("main","upload",this.switchMainContainer); };
	var upload = new uploadCtrl($('#upload'));
	router.route("upload","upload",uploadRouteHandler);

});

