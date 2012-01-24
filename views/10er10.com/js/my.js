define(["js/domReady", "js/user","js/d10.rest","js/d10.templates", "js/dnd", "js/playlist.new", "js/paginer", 
	   "js/d10.router", "js/d10.utils", "js/osd", "js/d10.imageUtils", "js/config", "js/d10.events"],
	   function(foo, user, rest, tpl, dnd, playlist, restHelpers, router, toolbox, osd, imageUtils, config, pubsub) {

function myCtrl (ui) {
	
	//this deverve its own file...
	pubsub.topic("review.count").subscribe(function(data) {
		var count = data.count;
		var rr = $("#reviewReminder");
		if ( count ) {
			$("strong",rr).html(count);
			rr.attr("title",tpl.mustacheView("side.review_reminder",{count: count}));
			if ( rr.is(":visible") ) {
				rr.whoobee();
			} else {
				rr.slideDown(function() {
					rr.flipflap();
				});
			}
		} else if ( rr.is(":visible") ) {
			rr.slideUp("fast");
		}
	});
	
	
	pubsub.topic("user.infos").one(function() {
		if ( !user.get_invites_count() ) { $("ul li[action=invites]",ui).hide(); }
	});

	ui.delegate("div.song",'dragstart', dnd.onDragDefault)
	.delegate("div.song","dragend", dnd.removeDragItem)
	.delegate("div.song","click",function(e) {
		var target = $(e.target);
		if ( target.closest(".add").length == 0 && target.closest(".artist").length == 0 && target.closest(".album").length == 0 )
			$(this).toggleClass("selected");
	})
	.delegate("div.song","dblclick",function(e) {
		if ( $("span.review",this).length ) { return false; }
		var toAppend = $(this).clone();
		playlist.appendToCurrent(toAppend);
		playlist.driver().play( playlist.getTrackParameters(toAppend) );
// 		playlist.append($(this).clone());
	});
	
	
	var display = function(label, sublabel) {
		sublabel = sublabel ? [ sublabel ] : [];
		routeAction(label, sublabel);
	};
	
  var routeAction = function (label, segments) {
      debug("routeAction starts",label,segments);
      var topicdiv=$('div[name='+label+']',ui);
      if ( !topicdiv.length ) {
        topicdiv=$('<div name="'+label+'"></div>');
        ui.append(topicdiv);
        if ( label == "likes" || label == "songs" ) {
          topicdiv.append(tpl.mustacheView("loading"));
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
  
  
	var bindControls = function(endpoint, topicdiv, section, list, parseResults) {
		
		topicdiv.find(".pushAll").click(function() {
			playlist.append(topicdiv.find(".song").clone().removeClass("selected"));
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
			createInfiniteScroll(endpoint, topicdiv, section, list, parseResults);
		});
	};

	var createInfiniteScroll = function(endpoint, topicdiv, section, list, parseResults) {
		var loadTimeout = null, 
			innerLoading = topicdiv.find(".innerLoading"),
			cursor = new restHelpers.couchMapCursor(endpoint);
		
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
			section.d10scroll(
				cursor,
				list,
				callbacks
			)
		);
	};
	
	var init_topic_likes = function(topicdiv,args) {
		var section = topicdiv.find("section");
		if ( !section.length ) {
			topicdiv.append(tpl.mustacheView("library.content.simple"));
			section = topicdiv.find("section");
			var list = section.find(".list");
			var endpoint = rest.user.likes;
			list.delegate("div.song .edit, div.song .review","click", function() {
				router.navigateTo(["my","review",$(this).closest('.song').attr('name')]);
				return false;
			});
			bindControls (endpoint, topicdiv, section, list);
			createInfiniteScroll(endpoint, topicdiv, section, list);
		}
	};

	var init_topic_songs = function(topicdiv,args) {
		var section = topicdiv.find("section");
		if ( !section.length ) {
			topicdiv.append(tpl.mustacheView("library.content.simple"));
			section = topicdiv.find("section");
			var list = section.find(".list");
// 			var url = "/api/list/s_user";
			var endpoint = rest.user.songs;
			var parseResults = function(rows) {
				var html = "";
				rows.forEach(function(v) { html += tpl.song_template(v.doc); });
				html = $(html);
				html.each(function() {
					if ( $(this).attr('data-reviewed') == "true" ) {
						$(this).append(tpl.mustacheView('my.song_template_trailer'));
					} else {
						$(this).append(tpl.mustacheView('my.song_template_review_trailer'));
						$("span.add",this)
							.after( tpl.mustacheView('my.song_template_review_header') )
							.remove();
					}
				});
// 				debug("parseResults: ",html);
				return html;
			};
			list.delegate("div.song .edit, div.song .review","click", function() {
				router.navigateTo(["my","review",$(this).closest('.song').attr('name')]);
// 				window.location.hash = "#/my/review/"+encodeURIComponent($(this).closest('.song').attr('name'));
				return false;
			});
			bindControls (endpoint, topicdiv, section, list, parseResults);
			createInfiniteScroll(endpoint,topicdiv,section,list,parseResults);
			
			
		}
		
	}

	
	
	
  var sendInvite = function(topicdiv,email) {
    rest.user.invites.send(email, {
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
	  
	rest.user.invites.count({
		load: function(err,count) {
			if ( err ) return ;
			if ( count ) {
				topicdiv.html(tpl.mustacheView("my.invites.invites",{count: count, ttl: config.invites.ttl}) );
				var button = $("button",topicdiv);
				var invalidLabel = $("span[name=invalidEmail]",topicdiv);
				$("input[name=email]",topicdiv).keyup(function() {
			//           debug("email reg testing ",$(this).val());
					if ( toolbox.isValidEmailAddress($(this).val()) ) {
						if ( invalidLabel.is(":visible") ) invalidLabel.hide(); 
						if ( button.not(":visible") )      button.fadeIn();
					} else {
						if ( invalidLabel.not(":visible") ) invalidLabel.show();
						if ( button.is(":visible") )      button.hide();
					}
				});
				button.click(function() { sendInvite(topicdiv, $("input[name=email]",topicdiv).val() ) });

			} else {
				topicdiv.html(tpl.mustacheView("my.invites.invites.none",{count: count, ttl: config.invites.ttl}) );
			}
		}
	});
  };




	var init_topic_review = function (topicdiv, arg ) {
		
		rest.user.review.list({
			load: function(err,songs) {
				if ( err  ) {
					// mainerror_json_client("textStatus", 'review', null);
					return ;
				}
				if ( songs.length ) {
					topicdiv.empty().append(tpl.mustacheView("review.list", {rows: songs}));
					$('ul > li',topicdiv).click(function() {
			// 			window.location.hash = "#/my/review/"+$(this).attr('arg');
						router.navigateTo(["my","review",$(this).attr("arg")]);
					});
				} else {
					topicdiv.empty().append(tpl.mustacheView("review.list.none", {}));
				}
			}
		});
	}

  var postSongReview = function (topicdiv, success, complete ) {
	rest.user.review.post(
		$('input[name=_id]',topicdiv).val(),
		$('form',topicdiv).serialize(),
		{
			load: function(err,data) {
				complete.call();
				if ( err ) {
					if ( err == 412 ) {
						for ( var k in data ) {
							$('.form_error[name='+k+']',topicdiv).html(data[k]).slideDown();
						}
						$('span.uploading',topicdiv).hide();
						$("button[name=remove]",topicdiv).show();
						$("button[name=review]",topicdiv).show();
						$("button[name=reviewNext]",topicdiv).show();
					} else {
						osd.send("info","Unable to record song...");
					}
				} else {
					success.call();
				}
			}
		}
	);
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
		

		var sendImageToServer = function(file, api, canvas, cb) {
			rest.song.uploadImage(song_id, file, file.name, file.size, {
				load: function(err, headers, body) {
					if ( err || !body || !body.filename ) {
						debug("image upload failed",err, body);
						osd.send("error",tpl.mustacheView("my.review.error.filetransfert"));
						canvas.remove();
						cb(false);
						return ;
					}
					osd.send("info",tpl.mustacheView("my.review.success.filetransfert",{filename: file.name}));
					canvas.remove();
					dropbox.find(".images").append(
							tpl.mustacheView("my.image.widget",{url: imageUtils.getImageUrl(body.filename)})
					);
					cb();
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
		
		function readImage (file) {
			var reader = new FileReader();
			reader.onload = function(e) {
				var canvas = $("<canvas />")
					.attr("width",config.img_size+"px")
					.attr("height",config.img_size+"px")
					.css({width: config.img_size, height: config.img_size, border: "1px solid #7F7F7F"});
				var api = canvas.loadImage(e, 
					{
						onReady: function() {
							debug("ready ! ");
							dropbox.find(".images").append(canvas);
							jobs.queue.push(function(cb) {
								sendImageToServer(file, api, canvas, cb);
							});
							jobs.run();
						},
						onSize: function(w,h) {
							debug("got onSize",w,h);
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
		
		var jobs = {
			running: 0,
			queue: [],
			run: function() {
				if ( !this.queue.length ) {
					return ;
				}
				if ( this.running  ) {
					return ;
				}
				
				var next = this.queue.shift(), that = this;
				this.running += 1 ;
				next(function() {
					that.running -= 1;
					that.run();
				});
				
				
			}
		};
		
		function handleFiles(files) {
			debug("handling file upload, nr of files: ",files.length);
			for (var i = 0; i < files.length; i++) { 
				debug("reading ",i);
				var file = files[i];
				if ( !imageUtils.isImage(file) ) {
					continue;
				}
				readImage (file);
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
			
			rest.song.removeImage(song_id, filename, {
				load: function(err,data) {
					if ( err ) {osd.send("error",err+" "+resp);}
					else {img.closest("div.imageReview").remove();}
				}
			});
		});
	};
	
	
	var deleteSong = function(id, then ) {
		rest.song.remove(id, {load: then});
	};
	
	var init_topic_songreview = function (topicdiv, song_id ) {
		topicdiv.html(tpl.mustacheView("loading"));
		rest.song.get(song_id, {
			load: function(err,doc) {
				debug("init_topic_songreview: ",doc);
				if ( err ) {
					topicdiv.html( tpl.mustacheView("review.song.error",{id: song_id})  );
					return ;
				}
				var images = doc.images ? doc.images : [];
				doc.images = [];
				doc.download_link = "audio/download/"+doc._id;
				$.each(images, function(k,v) {
					doc.images.push(
						tpl.mustacheView("my.image.widget",{url: imageUtils.getImageUrl(v.filename)})
							);
				});
				topicdiv.html( tpl.mustacheView("review.song",doc)  );
				init_songreview_imagesbox (topicdiv,song_id);
				init_reviewImage_remove (topicdiv,song_id);
				$("button[name=my]",topicdiv).click(function() { 
					router.navigateTo(["my","review"]);
				});
				$('button[name=upload]',topicdiv).click(function() { 
					router.navigateTo(["upload"]);
				});

				$('input[name=album]',topicdiv).permanentOvlay(
					rest.album.list,
					$('input[name=album]',topicdiv).parent().find(".overlay"),
					{
						"autocss": true,
						"varname": 'start', 
						"minlength" : 1 
					}
				);
				
				$('input[name=artist]',topicdiv).permanentOvlay(
					rest.artist.list,
					$('input[name=artist]',topicdiv).parent().find(".overlay"),
					{
						"autocss": true,
						"varname": 'start', 
						"minlength" : 1 
					}
				);
				
				$('input[name=genre]',topicdiv).permanentOvlay(
					rest.genre.list,
					$('input[name=genre]',topicdiv).parent().find(".overlay"),
					{
						"autocss": true,
						"varname": 'start', 
						"minlength" : 1 
					}
				);
				
				$("button[name=remove]",topicdiv).click(function(e) {
					topicdiv.find("div[name=form]").hide();
					topicdiv.find("div[name=delete]").show();
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
						}
					);
					return false;
				});

				
				rest.user.review.list({
					load: function(err,rows) {
						if ( err )	return ;
						for ( var index in rows ) {
							if ( rows[index]._id != song_id ) {
								debug("should show the alternative button");
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
											init_topic_songreview (topicdiv, rows[index]._id );
										}, function () {
											clearInterval(validate_interval);
										});
										return false;
									});
								});
								return;
							}
							$("button[name=reviewNext]",topicdiv).addClass("hidden");
						}
					}
				});
			}
		});
	}
  
	return {
		display: display
	};
	  
  
};

var 
	my = new myCtrl($("#my")),
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
	router._containers["my"] = 
	{
		tab: $("#my > nav > ul"), 
		container: $("#my"), 
		select: function(name) {return this.container.children("div[name="+name+"]"); }, 
		lastActive: null,
		currentActive: null
	};
	router.route("my", "my", myRouteHandler);
	router.route("my/likes", "my", function() {myRouteHandler.call(this,"likes");} );
	router.route("my/songs", "my", function() {myRouteHandler.call(this,"songs");} );
	router.route("my/invites", "my", function() {myRouteHandler.call(this,"invites");} );
	router.route("my/review", "my", function() {myRouteHandler.call(this,"review");} );
	router.route("my/review/:id", "my", function(id) {myRouteHandler.call(this,"review",id);} );
	router._containers.my.tab.delegate("[action]","click",function() {
		var elem = $(this), action = elem.attr("action");
		if ( ! elem.hasClass("active") ) { router.navigate("my/"+action,true); }
	});


});
