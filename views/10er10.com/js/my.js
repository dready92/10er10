(function(d10,$) {

d10.fn = d10.fn || {};
d10.fn.my = function (ui) {
	var plmanager = new d10.fn.plm(ui,ui.find('div[name=plm]'));
	
	$(document).one("user.infos",function() {
		if ( !d10.user.get_invites_count() ) { $("ul li[action=invites]",ui).hide(); }
	});

	ui.delegate("div.song",'dragstart', d10.dnd.onDragDefault)
	.delegate("div.song","dragend",d10.dnd.removeDragItem)
	.delegate("div.song","click",function(e) {
		var target = $(e.target);
		if ( target.closest(".add").length == 0 && target.closest(".artist").length == 0 && target.closest(".album").length == 0 )
			$(this).toggleClass("selected");
	})
	.delegate("div.song","dblclick",function(e) {
		if ( $("span.review",this).length ) { return false; }
		d10.playlist.append($(this).clone());
	});
	
	
	var display = function(label, sublabel) {
		sublabel = sublabel ? [ sublabel ] : [];
		routeAction(label, sublabel);
	}
	
  var routeAction = function (label, segments) {
      debug("routeAction starts",label,segments);
      var topicdiv=$('div[name='+label+']',ui);
      if ( !topicdiv.length ) {
        topicdiv=$('<div name="'+label+'"></div>');
        ui.append(topicdiv);
        if ( label == "likes" || label == "songs" ) {
          topicdiv.append(d10.mustacheView("loading"));
        }
      }
      if ( label == 'review' ) {
				debug("my",label,segments);
        if ( segments.length )  init_topic_songreview(topicdiv,segments[0]) ;
        else                    init_topic_review(topicdiv,null) ;
      } else if ( label == "songs" ) {
        init_topic_songs(topicdiv,segments);
      } else if ( label == "likes" ) {
        init_topic_likes(topicdiv,segments);
      } else if ( label == "invites" ) {
        init_topic_invites(topicdiv,segments);
      }
  };

	var selectVisible = function(categorydiv) {
		var list = categorydiv.find(".list"),
			parent = list.parent(),
			songs = list.children(),
			coutHeight = parent.outerHeight(),
			ctop = parent.position().top;

		songs.removeClass("selected");
		for ( var i = 0, last = songs.length; i<last; i++ ) {
			var song = songs.eq(i),
			postop = song.position().top -ctop,
			outheight = song.outerHeight(),
			delta = outheight * 0.1;
			if ( postop >= -delta ) {
				if (  (postop + outheight - delta) < coutHeight ) {
				song.addClass("selected");
				} else {
					break;
				}
			}
		}
	};
  
  
	var bindControls = function(url, topicdiv, section, list, parseResults) {
		
		topicdiv.find(".pushAll").click(function() {
			d10.playlist.append(topicdiv.find(".song").clone().removeClass("selected"));
		});
		topicdiv.find(".selectVisible").click(function() {
			selectVisible(topicdiv);
		});
		topicdiv.find(".refresh").click(function() {
			topicdiv.find(".song").remove();
			var is = section.data("infiniteScroll");
			if ( is && "remove" in is ) {
				is.remove();
			}
			createInfiniteScroll(url, topicdiv, section, list, parseResults);
		});
	};

	var createInfiniteScroll = function(url, topicdiv, section, list, parseResults) {
		var loadTimeout = null, 
			innerLoading = topicdiv.find(".innerLoading");
		
		var callbacks = {
			onFirstContent: function(length) {
				topicdiv.find(".pleaseWait").remove();
				topicdiv.find(".songlist").removeClass("hidden");
				if ( !length ) {
					topicdiv.find("article").hide();
					topicdiv.find(".noResult").removeClass("hidden");
					return ;
				}
				// list of items < section height
				if ( list.height() < section.height() )  {
					section.height(list.height()+10);
					section.next(".grippie").hide();
				} else {
					section.makeResizable(
						{
							vertical: true,
							minHeight: 100,
							maxHeight: function() {
								// always the scrollHeight
								var sh = list.prop("scrollHeight");
								if ( sh ) {
									return sh -10;
								}
								return 0;
							},
							grippie: $(topicdiv).find(".grippie")
						}
												);
				}
			},
			onQuery: function() {
				loadTimeout = setTimeout(function() {
					loadTimeout = null;
					debug("Loading...");
					innerLoading.css("top", section.height() - 32).removeClass("hidden");
				},500);
			},
			onContent: function() {
				if ( loadTimeout ) {
					clearTimeout(loadTimeout);
				} else {
					innerLoading.addClass("hidden");
				}
			}
		};
		if ( parseResults ) { callbacks.parseResults = parseResults; }
			
		section.data("infiniteScroll",
			section.infiniteScroll(
				url,
				{},
				list,
				callbacks
			)
		);
	};
	
	var init_topic_likes = function(topicdiv,args) {
		var section = topicdiv.find("section");
		if ( !section.length ) {
			topicdiv.append(d10.mustacheView("library.content.simple"));
			section = topicdiv.find("section");
			var list = section.find(".list");
			var url = "/api/list/likes";
			list.delegate("div.song .edit, div.song .review","click", function() {
				d10.router.navigateTo(["my","review",$(this).closest('.song').attr('name')]);
// 				window.location.hash = "#/my/review/"+encodeURIComponent($(this).closest('.song').attr('name'));
				return false;
			});
			bindControls (url, topicdiv, section, list);
			createInfiniteScroll(url, topicdiv, section, list);
		}
	};

	var init_topic_songs = function(topicdiv,args) {
		var section = topicdiv.find("section");
		if ( !section.length ) {
			topicdiv.append(d10.mustacheView("library.content.simple"));
			section = topicdiv.find("section");
			var list = section.find(".list");
			var url = "/api/list/s_user";
			var parseResults = function(rows) {
				var html = "";
				rows.forEach(function(v) { html += d10.song_template(v.doc); });
				html = $(html);
				html.each(function() {
					if ( $(this).attr('data-reviewed') == "true" ) {
						$(this).append(d10.mustacheView('my.song_template_trailer'));
					} else {
						$(this).append(d10.mustacheView('my.song_template_review_trailer'));
						$("span.add",this)
							.after( d10.mustacheView('my.song_template_review_header') )
							.remove();
					}
				});
// 				debug("parseResults: ",html);
				return html;
			};
			list.delegate("div.song .edit, div.song .review","click", function() {
				d10.router.navigateTo(["my","review",$(this).closest('.song').attr('name')]);
// 				window.location.hash = "#/my/review/"+encodeURIComponent($(this).closest('.song').attr('name'));
				return false;
			});
			bindControls (url, topicdiv, section, list, parseResults);
			createInfiniteScroll(url,topicdiv,section,list,parseResults);
			
			
		}
		
	}

	
	
	
  var sendInvite = function(topicdiv,email) {
    d10.rest.user.invites.send(email, {
      load: function (err, data) {
		if ( err ) {
				$("article.my",topicdiv).hide();
				$("article.notsent",topicdiv).fadeIn();
		} else {
	//         debug("success");
			$("article.my",topicdiv).hide();
			$("article.sent",topicdiv).fadeIn();
		}
      }
    });
  }
  
  var init_topic_invites = function(topicdiv,args) {
	  
	d10.rest.user.invites.count({
		load: function(err,count) {
			if ( err ) return ;
			if ( count ) {
				topicdiv.html(d10.mustacheView("my.invites.invites",{count: count, ttl: d10.config.invites.ttl}) );
				var button = $("button",topicdiv);
				var invalidLabel = $("span[name=invalidEmail]",topicdiv);
				$("input[name=email]",topicdiv).keyup(function() {
			//           debug("email reg testing ",$(this).val());
					if ( d10.isValidEmailAddress($(this).val()) ) {
						if ( invalidLabel.is(":visible") ) invalidLabel.hide(); 
						if ( button.not(":visible") )      button.fadeIn();
					} else {
						if ( invalidLabel.not(":visible") ) invalidLabel.show();
						if ( button.is(":visible") )      button.hide();
					}
				});
				button.click(function() { sendInvite(topicdiv, $("input[name=email]",topicdiv).val() ) });

			} else {
				topicdiv.html(d10.mustacheView("my.invites.invites.none",{count: count, ttl: d10.config.invites.ttl}) );
			}
		}
	});
  };




	var init_topic_review = function (topicdiv, arg ) {
		var options = {
		'url': site_url+"/html/my/review",
		'context': this,
		'callback': function(response) {
			if ( response.status != 'success'  ) {
			// mainerror_json_client("textStatus", 'review', null);
			return ;
			}
			topicdiv.empty().append(response.data);
			$('ul > li',topicdiv).click(function() {
	// 			window.location.hash = "#/my/review/"+$(this).attr('arg');
				d10.router.navigateTo(["my","review",$(this).attr("arg")]);
			});
		}
		};
		d10.bghttp.get(options);
	}

  var postSongReview = function (topicdiv, success, complete ) {
    d10.bghttp.put ({
      'url': site_url+'/api/meta/'+$('input[name=_id]',topicdiv).val(),
      'dataType': 'json',
      'data': $('form',topicdiv).serialize(),
      'timeout': 300000,
      'complete': function(xhr,text) {
        complete.call();
      },
      'error': function (xhr,text,errorThrown) {
      },
      'success': function(data) {
        if ( data.status == 'error' && data.data.code == 6 ) {
          for ( var k in data.fields ) {
            $('.form_error[name='+k+']',topicdiv).html(data.fields[k]).slideDown();
          }
          $('span.uploading',topicdiv).hide();
		  $("button[name=remove]",topicdiv).show();
          $("button[name=review]",topicdiv).show();
          $("button[name=reviewNext]",topicdiv).show();
        } else if ( data.status == 'error' ) {
          // mainerror_json(data, 'my', arg)
        } else {
          success.call();
        }
      }
    });
  };

	var init_songreview_imagesbox = function(topicdiv, song_id) {
		var dropbox = topicdiv.find(".uploadDropBox");
		dropbox.get(0).addEventListener("dragenter", dragenter, false);
		dropbox.get(0).addEventListener("dragleave", dragleave, false);    
		dropbox.get(0).addEventListener("dragover", dragover, false);  
		dropbox.get(0).addEventListener("drop", drop, false);  

		function dragenter(e) {
			dropbox.addClass("hover");
			e.stopPropagation();  
			e.preventDefault();  
		}  
			
		function dragover(e) {  
			e.stopPropagation();  
			e.preventDefault();  
		}  

		function dragleave (e) {
			dropbox.removeClass("hover");
		}

		function drop(e) {  
			e.stopPropagation();  
			e.preventDefault();  
			dropbox.removeClass("hover");
			var dt = e.dataTransfer;  
			var files = dt.files;
			handleFiles(files);
		}
		
		function isImage(file) {
			return file.type.match(/^image/);
		}
		
		function getImageRatio (width,height) {
			if ( width == 0 || height == 0 ) { return 0; }
			var ratio;
			if ( width > height ) {
				ratio = width / height;
			} else {
				ratio = height / width;
			}
			debug("image ratio : ",ratio);
			return ratio;
		}
		
		function handleFiles(files) {
			debug("handling file upload, nr of files: ",files.length);
			var jobs = [];
			for (var i = 0; i < files.length; i++) { 
				debug("reading ",i);
				var file = files[i];
				if ( !isImage(file) ) {
					continue;
				}
				
				jobs.push( (function(file) { 
					return function() {
						var reader = new FileReader();
						// Closure to capture the file information.
						reader.onload = function(e) {
// 							debug("reader.onload");
							// Render thumbnail.
							var img = $("<img />").attr("src",e.target.result).css(
								{
									"visibility":"none",
									"position": "absolute",
									"top": 0,
									"left": -10000
								}
							);
							
							$("body").append(img);
							
							
							
							
							// timeout for chrome to get img width & height properly
							var doTheRest = function() {
								var w = img.width(), h = img.height();
// 								debug("image size: ",w,h);						
								var ratio = getImageRatio(w,h);
								if ( ratio > 1.5 ) {
									d10.osd.send("error",file.name+": "+d10.mustacheView("my.review.error.imagesize"));
									img.remove();
									return ;
								}
								if ( w > h ) {
									h = h / w * d10.config.img_size;
									w = d10.config.img_size;
								} else {
									w = w / h * d10.config.img_size;
									h = d10.config.img_size;
								}
								img.width(w).height(h).css("position","static").appendTo(dropbox.find(".images")).css("visibility","visible");
								
								var binReader = new FileReader();
								binReader.onload = function(e) {
									var xhr = new XMLHttpRequest();
									var url = site_url+"/api/songImage/"+song_id+"?"+$.d10param({"filesize": file.size, "filename": file.name } );
									xhr.upload.addEventListener("load", function(e) {  
										debug("File transfer completed");
									},false);
									xhr.addEventListener("readystatechange",function() {
										//         console.log("ready state changed : ", xhr.readyState);
										if ( xhr.readyState == 4 ) {
											if ( xhr.status == 200 ) {
												debug("image upload got status 200");
											} else {
												debug("image upload failed",xhr.status,xhr.responseText);
												d10.osd.send("error",d10.mustacheView("my.review.error.filetransfert"));
												xhr = null;
												return ;
											}
											var back = null;
											try {
												back = JSON.parse(xhr.responseText);
											} catch (e) {
												back = {'status': 'error'};
											}
											debug("xhr response : ",back);
											xhr = null;
											if ( back.status == "error" ) {
												d10.osd.send("error",back.data.infos);
												img.remove();
												return ;
											}
											d10.osd.send("info",d10.mustacheView("my.review.success.filetransfert",{filename: file.name}));
											img.remove();

											dropbox.find(".images").append(
												d10.mustacheView("my.image.widget",{url: d10.config.img_root+"/"+back.data.filename})
																	);
										}
									},false);
									xhr.open("POST",url);
									if ( "sendAsBinary" in xhr ) {
										xhr.sendAsBinary(binReader.result);
									} else {
										xhr.send(file);
									}
								};
								binReader.readAsBinaryString(file);
							};
// 							debug("setting timeout");
							setTimeout(doTheRest,1000);
						};
						// Read in the image file as a data URL.
						reader.readAsDataURL(file);
						if ( jobs.length ) {
// 							debug("launching next job, currently job length is",jobs.length);
							setTimeout(jobs.pop(),1000);
						}
					}
				})(file) );
			}
			debug("jobs length",jobs.length);
			if ( jobs.length ) {
				jobs.pop()();
			}
		}
		
	};

	var init_reviewImage_remove = function(topicdiv, song_id) {
		topicdiv.delegate("img.remove","click",function() {
			var img = $(this);
			var filename = img.siblings().eq(0).attr("src").split("/").pop();
			if ( !filename || !filename.length ) {
				return ;
			}
			
			d10.bghttp.del({
				url: "/api/songImage/"+song_id+"/"+filename,
				success: function(resp) {
					img.closest("div.imageReview").remove();
				},
				error: function(err,resp) {
					d10.osd.send("error",err+" "+resp);
				}
			});
			
		});
	};
	
	
	var deleteSong = function(id, then ) {
		debug("deleteSongURL: ",site_url+"/api/deleteSong/"+id);
// 			setTimeout(function() {
		d10.bghttp.put({
			url: site_url+"/api/deleteSong/"+id,
			dataType: "json",
			success: function(response) {
				
				if ( response.status && response.status == "error" ) {
					return then(response);
				}
				return then();
			},
			error: function(err) {
				return then(err);
			}
		});
	};
	
	var init_topic_songreview = function (topicdiv, song_id ) {
//     console.log("init_topic_songreview",topicdiv,arg);
		topicdiv.html(d10.mustacheView("loading"));
		d10.bghttp.get({
			url: site_url+"/api/song/"+song_id,
			dataType: "json",
			success: function(msg) {
		debug("init_topic_songreview: ",msg);
		if ( msg.status == "error" ) {
			topicdiv.html( d10.mustacheView("review.song.error",{id: song_id})  );
			return ;
		}
		var doc = msg.data, images = doc.images ? doc.images : [];
		doc.images = [];
		doc.download_link = "audio/download/"+doc._id;
		$.each(images, function(k,v) {
			doc.images.push(
				d10.mustacheView("my.image.widget",{url: d10.config.img_root+"/"+v.filename})
					   );
		});
		
		
		topicdiv.html( d10.mustacheView("review.song",doc)  );
		init_songreview_imagesbox (topicdiv,song_id);
		init_reviewImage_remove (topicdiv,song_id);
		$("button[name=my]",topicdiv).click(function() { 
			d10.router.navigateTo(["my","review"]);
// 			window.location.hash = "#/my/review";
		});
		$('button[name=upload]',topicdiv).click(function() { 
// 			d10.globalMenu.route("/upload");
			d10.router.navigateTo(["upload"]);
		});

		$('input[name=album]',topicdiv).permanentOvlay(
			d10.rest.album.list,
			$('input[name=album]',topicdiv).parent().find(".overlay"),
			{
				"autocss": true,
				"varname": 'start', 
				"minlength" : 1 
			}
		);
		
		$('input[name=artist]',topicdiv).permanentOvlay(
			d10.rest.artist.list,
			$('input[name=artist]',topicdiv).parent().find(".overlay"),
			{
				"autocss": true,
				"varname": 'start', 
				"minlength" : 1 
			}
		);
		
		$('input[name=genre]',topicdiv).permanentOvlay(
			d10.rest.genre.list,
			$('input[name=genre]',topicdiv).parent().find(".overlay"),
			{
				"autocss": true,
				"varname": 'start', 
				"minlength" : 1 
			}
		);
		
		$("button[name=remove]",topicdiv).click(function(e) {
// 			$(this).hide();
// 			$('button[name=review]',topicdiv).hide();
// 			$('button[name=reviewNext]',topicdiv).hide();
// 			$('span.uploading',topicdiv).show();
// 			$('.form_error',topicdiv).hide();
			topicdiv.find("div[name=form]").hide();
			topicdiv.find("div[name=delete]").show();
// 			deleteSong(song_id,function() {});
// 			e.preventDefault();
			return false;
		});
		
		topicdiv.find("button[name=cancelDelete]").click(function() {
			topicdiv.find("div[name=delete]").hide();
			topicdiv.find("div[name=form]").show();
			return false;
		});
		
		topicdiv.find("button[name=doDelete]").click(function() {
			$(this).attr("disabled","true");
 			deleteSong(song_id,function(err) {
				topicdiv.find("div[name=delete]").hide();
				if ( err ) {
					topicdiv.find("div[name=deleteError]").show();
				} else {
					topicdiv.find("div[name=deleteSuccess]").show();
				}
			});
			return false;
		});
		

		$('button[name=review]',topicdiv).click(function() {
			// disappear
			$(this).hide();
			$('button[name=remove]',topicdiv).hide();
			$('button[name=reviewNext]',topicdiv).hide();
			$('span.uploading',topicdiv).show();
			$('.form_error',topicdiv).hide();

			var validate_interval = window.setInterval(function () {
				$('span.uploading',topicdiv).animate ( { "opacity": 0 }, 1500,
					function() { $(this).animate ( { "opacity": 1 }, 1500); }
				);
			},3100);

          postSongReview(topicdiv,function() {
              $('div[name=ok] span[name=artist]',topicdiv).html($('input[name=artist]',topicdiv).val());
              $('div[name=ok] span[name=title]',topicdiv).html($('input[name=title]',topicdiv).val());
              $('div[name=form]',topicdiv).slideUp(function() {
                $('div[name=ok]',topicdiv).slideDown();
              });
            }, function () {
              clearInterval(validate_interval);
          });
          return false;
		});

        d10.bghttp.get({
          "url": site_url+"/api/songsToReview",
          "dataType": "json",
          "success": function (response) {
            for ( var index in response.data.rows ) {
              if ( response.data.rows[index].id != song_id ) {
                $("button[name=reviewNext]",topicdiv).fadeIn(function() {
                  $(this).removeClass("hidden").click(function() {
                    $(this).hide();
                    $("button[name=review]",topicdiv).hide();
                    $('span.uploading',topicdiv).show();
                    $('.form_error',topicdiv).hide();

                    var validate_interval = window.setInterval(function () {
                    $('span.uploading',topicdiv).animate ( { "opacity": 0 }, 1500,
                        function() { $(this).animate ( { "opacity": 1 }, 1500); }
                      );
                    },3100);

                    postSongReview(topicdiv,function() {
                        init_topic_songreview (topicdiv, response.data.rows[index].id );
                      }, function () {
                        clearInterval(validate_interval);
                    });
                    return false;
                  });
                });
                return;
              }
            }
            $("button[name=reviewNext]",topicdiv).remove();
          }
        });


			},
			error: function (XMLHttpRequest, textStatus, errorThrown) {
				debug ("Ajax error: textStatus="+textStatus+", errorThrown="+errorThrown);
				//mainerror_json_client(textStatus, 'review', null);
			}
		});
	}
  
	return {
		display: display,
		plmanager: plmanager
	};
	  
  
};

})( window.d10 ? window.d10 : {}  , jQuery) ;


$(document).one("bootstrap:router",function() {

var 
	my = d10.my = new d10.fn.my($("#my")),
	myRouteHandler = function(topic,id) { 
		if ( !topic ) {
			if ( this._containers["my"].currentActive ) {
				this._activate("main","my",this.switchMainContainer);
				return ;
			} else {
				topic = "songs";
			}
		}

		my.display(topic,id);
		this._activate("main","my",this.switchMainContainer); 
		if ( topic ) { this._activate("my",topic); }
	};
	d10.router._containers["my"] = 
	{
		tab: $("#my > nav > ul"), 
		container: $("#my"), 
		select: function(name) {return this.container.children("div[name="+name+"]"); }, 
		lastActive: null,
		currentActive: null
	};
	d10.router.route("my", "my", myRouteHandler);
	d10.router.route("my/:topic", "my", myRouteHandler);
	d10.router.route("my/:topic/:id", "my", myRouteHandler);
	d10.router._containers.my.tab.delegate("[action]","click",function() {
		var elem = $(this), action = elem.attr("action");
		if ( ! elem.hasClass("active") ) { d10.router.navigate("my/"+action,true); }
	});

});
