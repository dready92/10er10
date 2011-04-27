$(document).ready(function() {

var my = function () {

	//self ref
	var that=this;
	//create UI
	var ui=$('#my');
	this.plmanager = new d10.fn.plm(ui,$('div[name=plm]',ui));
	//$('#main').append(ui);
	
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
	

	var checkCacheFreshness = function (topicdiv,pager) {
		if ( topicdiv.find("article div.refreshList").length ) {
			return ;
		}
		pager.checkCache(function() { 
			var refresh = $(d10.mustacheView("refresh"));
			refresh.one("click",function() {
				pager.display_page(1);
				refresh.remove();
			}).hide();
			refresh.appendTo(topicdiv.find("article")).fadeIn("slow");
		});
	};
	
	
  this.routeAction = function (label, segments) {
//       debug("routeAction starts",label,segments);
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
        if ( segments.length )  that.init_topic_songreview(topicdiv,segments[0]) ;
        else                    that.init_topic_review(topicdiv,null) ;
      } else if ( label == "songs" ) {
        that.init_topic_songs(topicdiv,segments);
      } else if ( label == "likes" ) {
        that.init_topic_likes(topicdiv,segments);
      } else if ( label == "invites" ) {
        that.init_topic_invites(topicdiv,segments);
      }
  };

  this.init_topic_likes = function(topicdiv,args) {
    //
    //get pager
    //
    var pager = topicdiv.data('pager');
    if ( !pager ) {
      pager = new d10.fn.paginer(
        site_url+'/api/pagination/s_user_likes',
        null,
        site_url+'/api/usersongs',
        d10.mustacheView('library.content.simple'),
        d10.mustacheView('library.content.none'),
        topicdiv,
        function () { }
      );
      topicdiv.data('pager',pager);
      pager.display_page(1);    
    } else {
		checkCacheFreshness(topicdiv,pager);
	}
  };
  
  var sendInvite = function(topicdiv,email) {
    d10.bghttp.post({
      "url": site_url+"/api/sendInvite",
      "method": "POST",
      "data": {"email": email},
      "success": function (data) {
//         debug("success");
        $("article.my",topicdiv).hide();
        $("article.sent",topicdiv).fadeIn();
      },
      "error": function(a,b,c) {
//         debug("error",a,b,c);
        $("article.my",topicdiv).hide();
        $("article.notsent",topicdiv).fadeIn();
        
      }
    });
  }
  
  this.init_topic_invites = function(topicdiv,args) {
    d10.bghttp.get({
      "url": site_url+"/html/invites",
      "success": function (data) {
        topicdiv.html(data);
        var button = $("button",topicdiv);
        if ( !button.length )
          return ;
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
      }
    });
  };

	this.init_topic_songs = function(topicdiv,args) {
		//
		//get pager
		//
		var pager = topicdiv.data('pager');
		if ( !pager ) {
			pager = new d10.fn.paginer(
				site_url+'/api/pagination/s_user',
				null,
				site_url+'/api/songs/s_user',
				d10.mustacheView('library.content.simple'),
				d10.mustacheView('library.content.none'),
				topicdiv,
				function () {
					$('.song',$(this)).each(function() {
						if ( $(this).attr('data-reviewed') == "true" ) {
							$(this).append(d10.mustacheView('my.song_template_trailer'));
						} else {
							$(this).append(d10.mustacheView('my.song_template_review_trailer'));
							$("span.add",this)
								.after( d10.mustacheView('my.song_template_review_header') )
								.remove();
						}
					});
				}
			);
			topicdiv.data('pager',pager);
			topicdiv.delegate("div.song .edit, div.song .review","click", function() {
				window.location.hash = "#/my/review/"+encodeURIComponent($(this).closest('.song').attr('name'));
				return false;
			});
			//
			// display page 1
			//
			pager.display_page(1);
		} else {
			checkCacheFreshness(topicdiv,pager);
		}
	}



	this.init_topic_review = function (topicdiv, arg ) {
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
      window.location.hash = "#/my/review/"+$(this).attr('arg');
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
			for (var i = 0; i < files.length; i++) { 
				debug("reading ",i);
				var file = files[i];
				if ( !isImage(file) ) {
					continue;
				}
				var reader = new FileReader();
				
				// Closure to capture the file information.
				reader.onload = (function(file) {
					return function(e) {
						debug("reader.onload");
						// Render thumbnail.
						var img = $("<img />").attr("src",e.target.result).css(
							{
								"visibility":"none",
								"position": "absolute"
							}
						);
						
						$("body").append(img);
						var w = img.width(), h = img.height();
						debug("image size: ",w,h);
						var ratio = getImageRatio(img.width(),img.height());
						if ( ratio > 1.5 ) {
							d10.osd.send("error",file.name+": merci de choisir une image a peu pres carré...");
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
							xhr.upload.addEventListener("end", function(e) {  
								debug("File transfer completed");
							},false);
							xhr.addEventListener("readystatechange",function() {
								//         console.log("ready state changed : ", xhr.readyState);
								if ( xhr.readyState == 4 ) {
									if ( xhr.status == 200 ) {
										debug("image upload got status 200");
									} else {
										debug("image upload failed",xhr.status,xhr.responseText);
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
									
									
									img.remove();

									dropbox.find(".images").append(
										d10.mustacheView("my.image.widget",{url: d10.config.img_root+"/"+back.data.filename})
															);
								}
							},false);
							xhr.open("POST",url);
							xhr.sendAsBinary(binReader.result);
						};
						binReader.readAsBinaryString(file);
						
					};
				})(file);

				// Read in the image file as a data URL.
				reader.readAsDataURL(file);

			}
		}
		
	};
  
	this.init_topic_songreview = function (topicdiv, song_id ) {
//     console.log("init_topic_songreview",topicdiv,arg);
		topicdiv.html(d10.mustacheView("loading"));
		d10.bghttp.get({
			url: site_url+"/html/my/review/"+song_id,
			success: function(msg) {
		topicdiv.html(msg);
		init_songreview_imagesbox (topicdiv,song_id);
		$("button[name=my]",topicdiv).click(function() { 
			window.location.hash = "#/my/review";
		});
		$('button[name=upload]',topicdiv).click(function() { 
			d10.globalMenu.route("/upload");
		});

		$('input[name=album]',topicdiv).permanentOvlay(
			site_url+'/api/album',
			$('input[name=album]',topicdiv).parent().find(".overlay"),
			{
				"autocss": true,
				"varname": 'start', 
				"minlength" : 1 
			}
		);
		
		$('input[name=artist]',topicdiv).permanentOvlay(
			site_url+'/api/artist',
			$('input[name=artist]',topicdiv).parent().find(".overlay"),
			{
				"autocss": true,
				"varname": 'start', 
				"minlength" : 1 
			}
		);
		
		$('input[name=genre]',topicdiv).permanentOvlay(
			site_url+'/api/genre',
			$('input[name=genre]',topicdiv).parent().find(".overlay"),
			{
				"autocss": true,
				"varname": 'start', 
				"minlength" : 1 
			}
		);
		

		$('button[name=review]',topicdiv).click(function() {
			// disappear
			$(this).hide();
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
                        that.init_topic_songreview (topicdiv, response.data.rows[index].id );
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



	var mm = this.router = new d10.fn.menuManager ({
		'menu': $('>nav',ui),
		'container': ui,
		'active_class': 'active',
		'default_active_label': 'plm',
		'property': 'name',
		'effects': false,
	    "routePrepend":["my"],
    	"useRouteAPI": true
	});

  // routes
  // /my/plm
  // /my/invites
  // /my/likes
  // /my/songs
  // /my/review
  // /my/review/[id]
  mm.bind("subroute.plm subroute.invites subroute.likes subroute.songs subroute.review",function(e,data) {
//        debug("subroute event receiver",data);
      that.routeAction(data.label, data.segments);
//       that.init_topic ( { "action": data.label, "id": data.segments.length ? data.segments[0] : null } );
  });

  $(document).bind("route.my",function(e,data) {
    var routes = {"plm": "plm", "invites": "invites","likes": "likes", "songs": "songs", "review": "review"};
    if ( !data.segments.length || ! data.segments[0] in routes ) { return ; }
    mm.route( data.segments, data.env );
  });

  
  
  
	  
  
};

d10.my = new my();
delete my;

});
