$(document).ready(function() {

var library = function () {
	var that=this;
	var ui=$('#library');

	ui.delegate("div.song",'dragstart', d10.dnd.onDragDefault)
		.delegate("div.song",'dragend',d10.dnd.removeDragItem)
		.delegate("div.song","dblclick",function(e) {
			d10.playlist.append($(this).clone());
		})
		.delegate("div.song","click",function(e) {
			var target = $(e.target);
			if ( target.closest(".add").length == 0 && target.closest(".artist").length == 0 && target.closest(".album").length == 0 )
				$(this).toggleClass("selected");
	});

	this.init_topic = function (topic,category) {
// 		debug("init_topic start");

		//
		// create topic div + controls (if any)
		//
		var topicdiv = $('div[name='+topic+']',ui);
		if ( topicdiv.length == 0 ) {
			topicdiv=$('<div name="'+topic+'"></div>');
			that.init_controls(topic,topicdiv);
			ui.append(topicdiv);
		}
		
		if ( topic == "genres" ) {
			if ( category ) {
				return displayGenre(topicdiv,category);
			} else {
				return displayGenres(topicdiv);
			}
		}
		//
		//if category is specified select it
		//
		if ( category ) {
			that.selectTopicCategory(topic,category,topicdiv);
		} else {
			category = getSelectedTopicCategory (topic, topicdiv );
		}

		//
		// launch the topic category display
		//
		that.init_topic_category(topic,topicdiv,category);
	} 


	var displayGenre = function(topicdiv, genre ) {
		var eGenre = escape(genre);
		var catdiv = topicdiv.find("div.content > div[name=\""+eGenre+"\"]");
		if ( catdiv.length == 0 ) {
			catdiv = $("<div name=\""+eGenre+"\"></div>");
			catdiv.append( d10.mustacheView("loading") );
			$("div.content",topicdiv).append(catdiv);
		}
		topicdiv.find("div.pleaseWait").hide();
		topicdiv.find("div.content>div").hide();
		catdiv.show();
// 		topicdiv.find("div.pleaseWait").show();
		var pager = catdiv.data('pager');
		if ( ! pager ) {
			pager = that.pager_init ("genres",catdiv,topicdiv,null,genre);
			catdiv.data('pager',pager);
			pager.display_page(1);
		} else {
			checkPagerFreshness(catdiv);
		}
// 		pager.display_page(1);
	};

	var displayGenres = function(topicdiv) {
		topicdiv.find("div.content").hide();
		topicdiv.find("div.pleaseWait").show();
		
		var cacheNotExpired = d10.localcache.getJSON("genres.index");
		if ( cacheNotExpired ) { 
// 			debug("genres expiration timeout not reached");
			topicdiv.find("div.content > div").hide();
			topicdiv.find("div.content").show().find("div.index").show();
			topicdiv.find("div.pleaseWait").hide();
			return ; 
		}
		
		d10.bghttp.get({
			url: site_url+"/api/genresResume",
			dataType: "json",
			success: function(response) {
				d10.localcache.setJSON("genres.index", {"f":"b"},true);
// 				debug(response.data);
				var content = "";
				$.each(response.data,function(k,v) { //{"key":["Dub"],"value":{"count":50,"artists":["Velvet Shadows","Tommy McCook & The Aggrovators","Thomsons All Stars"]}}
					var artists = "";
					$.each(v.value.artists,function(foo,artist) {
						artists+=d10.mustacheView("library.listing.genre.line", {"artist": artist})
					});
					content+=d10.mustacheView("library.listing.genre", {"genre": v.key[0],"count": v.value.count},  {"artists": artists});
				});
// 				debug(content);
				$("div.index",topicdiv).html(content);
				topicdiv.find("div.content > div").hide();
				topicdiv.find("div.content").show().find("div.index").show();
				topicdiv.find("div.pleaseWait").hide();

				topicdiv.delegate("span.artistName","click",function() {
					location.hash = "#/library/artists/"+encodeURIComponent($(this).text());
				});
				topicdiv.delegate("div.genre > span","click",function() {
					location.hash = "#/library/genres/"+encodeURIComponent($(this).text());
				});
				topicdiv.delegate("span.all","click",function() {
					var genre = $(this).closest("div.genre").children("span").text();
					location.hash = "#/library/genres/"+encodeURIComponent(genre);
				});
			}
		});
	};

	/**
	* topic category : some topics have only one category (ex ts_creation)
	* some topics have many categories ( ex genres )
	*
	*
	*/
	this.init_topic_category = function (topic,topicdiv,category) {
// 		debug("entering init_topic_category "+topic+' '+category);
		//
		// get id
		//
		var id = that.get_id(topic,topicdiv,category);
		//
		// get topic category container
		//
		var categorydiv=$('div[name="'+id+'"]',topicdiv);
		if ( !categorydiv.length ) {
			categorydiv=$('<div name="'+id+'" class="topic_category">'+d10.mustacheView("loading")+'</div>');
			topicdiv.append(categorydiv);
		}
		
		// special pages
		if ( topic == "artists" && category == "<all>" ) {
			debug("special category case");
			allArtists(categorydiv);
		} else {
			
			//
			// get topic category pager
			//
			var pager = categorydiv.data('pager');
			if ( ! pager ) {
				pager = that.pager_init(topic,categorydiv,topicdiv,id,category);
				categorydiv.data('pager',pager);
				if ( category ) {
					pager.one("display_page/1",function() {
						d10.bghttp.get({
							url: site_url+"/api/RelatedArtists/"+ encodeURIComponent(category),
							dataType: "json",
							success: function(response) {
								var data = response.data;
								debug("got relatedArtists response",data);
								if ( data.artistsRelated.length ) {
// 									var relatedArtists = [];
// 									for ( var i in data.artistsRelated ) {
// 										for ( var j in data.artistsRelated[i].value ) {
// 											var artist = data.artistsRelated[i].value[j];
// 											if ( artist != category 
// 												&& relatedArtists.indexOf(artist) < 0 
// 												&& data.artists.indexOf(artist) < 0 ) {
// 												relatedArtists.push(artist);
// 											}
// 										}
// 									}
// 									if ( relatedArtists.length ) {
// 										debug("category div: ",categorydiv);
										var relatedNode = categorydiv.find(".related");
// 										debug("category div: ",categorydiv, relatedNode);
										setTimeout(function() {
											relatedNode
											.html(d10.mustacheView("library.content.artist.related",{artists: data.artistsRelated}))
// 											.show()
											.addClass("ontop").delegate(".link","click",function() {
												var hash = "/library/artists/"+encodeURIComponent($(this).attr("name"));
												window.location.hash = hash;
											});
										},1000);
// 									}
								}
								debug("2nd degree artists",relatedArtists);
							}
						});
					});
				}
				pager.display_page(1);
			} else {
				checkPagerFreshness(categorydiv);
			}
		}

		//
		// show current topic category if not already visible
		//
		categorydiv.data("lastPrint",d10.time());
		if ( topicdiv.data('activeCategory') != id ) {
			$('div.topic_category',topicdiv).hide();
			categorydiv.show();
			topicdiv.data('activeCategory',id);
		}
		libGarbage();
	}

	var libGarbageTimeout = null;
	var libGarbage = function () {
		if ( libGarbageTimeout )	return false;
		
		var garbage = function () {
			var allcats = $("#library div.topic_category");
// 			debug("allcats length : ",allcats.length);
			if ( allcats.length < 6 ) {
				libGarbageTimeout = null;
				return ;
			}
			var oldest = null, oldestts = 0;
			allcats.each(function() {
				var lp = $(this).data("lastPrint");
				if ( oldestts == 0 || lp < oldestts ) {
					oldestts = lp;
					oldest = $(this);
				}
			});
// 			debug("library garbage : removing ",oldest);
			if ( oldest && oldest.length ) {
				oldest.remove();
			}
			libGarbageTimeout = setTimeout(garbage,3000);
		};
		libGarbageTimeout = setTimeout(garbage,3000);
	};


	var allArtists = function (container) {
		var cacheNotExpired = d10.localcache.getJSON("artists.allartists");
		if ( cacheNotExpired ) { return ; }
		d10.localcache.setJSON("artists.allartists", {"f":"b"},true);
		container.empty();
		d10.bghttp.get({
			"url": site_url+"/api/artistsListing",
			"dataType": "json",
			"success": function(data) {
				displayAllArtists(container,data);
			}
		});
	};

	var displayAllArtists = function (container, data) {
     debug("displayAllArtists",container,data);
		data = data.data;
		var letter = '';
		var letter_container = null;
		for ( var index in data.rows ) {
		var artist = data.rows[index].key.pop();
		var songs = data.rows[index].value;
		var current_letter = artist.substring(0,1);
		if ( current_letter != letter ) {
			if ( letter_container ) container.append(letter_container);
			letter = current_letter;
			letter_container = $( d10.mustacheView("library.listing.artist", {"letter": letter}) );
		}
		$(">div",letter_container).append( d10.mustacheView("library.listing.artist.line", {"artist": artist, "songs": songs}) );
		}
		if ( letter_container ) { container.append( letter_container ); }

		$("span.link",container).click(function() {
			window.location.hash = "#/library/artists/"+encodeURIComponent($(this).text());
		});
	};

	this.init_controls = function (topic,catdiv) {
//     debug("library.init_controls",topic,catdiv);
		if ( topic == 'genres' ) {
// 			return catdiv;
			catdiv.append( d10.mustacheView('library.control.genre') );
// 			$('select',catdiv).change(function() {
// 				window.location.hash = "#/library/"+topic+"/"+encodeURIComponent($(this).val());
// 			});
		} else if ( topic == 'artists' ) {
      
		catdiv.append( d10.mustacheView('library.control.artist') );
		var widget = $("input[name=artist]",catdiv);
		$("span[name=all]",catdiv).click(function(){ widget.val('').trigger('blur'); window.location.hash = "#/library/artists/"+encodeURIComponent("<all>"); });
		$('img[name=clear]',catdiv).click(function() { widget.val('').trigger('blur');window.location.hash = "#/library/"+topic+"/"; });
		widget.val(widget.attr('defaultvalue'))
		.permanentOvlay(site_url+'/api/artist', $(".overlay",catdiv),{
			"autocss": true,
			"minlength" : 1 ,
			"select": function (data, json) {
				window.location.hash = "#/library/"+topic+"/"+encodeURIComponent(data);
				return data;
			},
			"beforeLoad": function() {
				this.getOverlay().width(widget.width());
			},
		});
      
	  
	} else if ( topic == 'albums' ) {
		catdiv.append( d10.mustacheView('library.control.album') );
		var widget = $('input[name=album]',catdiv);
		widget.val(widget.attr('defaultvalue'))
		.permanentOvlay(site_url+'/api/album', $(".overlay",catdiv),
				{
					"varname": "start", 
					"minlength" : 1 ,
					"autocss": true,
					"select": function (data, json) {
						window.location.hash = "#/library/"+topic+"/"+encodeURIComponent(data);
						return data;
					}
				}
		);
		$('img[name=clear]',catdiv).click(function() { widget.val('').trigger("blur"); window.location.hash = "#/library/"+topic+"/"; });
		
	} else if ( topic == 'titles' ) {
		catdiv.append( d10.mustacheView('library.control.title') );
		var widget = $('input[name=title]',catdiv);
		widget.val(widget.attr('defaultvalue'))
		.permanentOvlay(site_url+'/api/title', $(".overlay",catdiv), 
			{
				"autocss": true,
				"varname": 'start', 
				"minlength" : 1 ,
				"select": function (data, json) {
					window.location.hash = "#/library/"+topic+"/"+encodeURIComponent(data);
					return data;
				}
			}
		);
		$('img[name=clear]',catdiv).click(function() { widget.val('').trigger("blur"); window.location.hash = "#/library/"+topic+"/"; });
	}
	return catdiv;
	}

	this.pager_init = function (topic,mydiv,catdiv,id,category) {
		var p_url = null;
		var p_data = null;
		var p_songs_url = null;
		var p_html_template = d10.mustacheView('library.content.simple');
		var p_html_none = d10.mustacheView('library.content.none');

		var callback = function () { }

		if ( topic == 'creations'  ) {
			p_url = site_url+'/api/pagination/ts_creation';
			p_songs_url = site_url+'/api/ts_creation';
			p_data = null;
		} else if ( topic == 'hits' ) {
			p_url = site_url+'/api/pagination/hits';
			p_songs_url = site_url+'/api/hits';
			p_data = null;
		} else if ( topic == 'genres' ) {
			p_url = site_url+'/api/pagination/genre';
			p_songs_url = site_url+'/api/genres/'+topic;
			p_data = { 'genre':  category };
			p_html_template = d10.mustacheView('library.content.genre');
			callback = function() {
				this.find("h2 span").eq(0).text( category );
				this.find("h2 span.link").click(function() {
					location.hash="#/library/genres";
				});
			};
		} else if ( topic == 'artists' ) {
			p_url = site_url+'/api/pagination/artist';
			p_songs_url = site_url+'/api/artists/'+topic;
			category = category || '';
			p_data = { 'artist':  category };
		} else if ( topic == 'albums' ) {
			p_url = site_url+'/api/pagination/album';
			p_songs_url = site_url+'/api/albums/'+topic;
			category = category || '';
			p_data = { 'album':  category };
		} else if ( topic == 'titles' ) {
			p_url = site_url+'/api/pagination/title';
			p_songs_url = site_url+'/api/titles/'+topic;
			category = category || '';
			p_data = { 'title':  category };
		} else {
			return false;
		}
//     debug("pager init ",topic, p_data);
		return new d10.fn.paginer (
			p_url,
			p_data,
			p_songs_url,
			p_html_template,
			p_html_none,
			mydiv,
			callback
		);
	}

	this.get_id = function (topic,catdiv,category) {
		var id=topic;
		category = category || '';
		if ( topic == 'genres' || topic == 'artists' || topic == 'albums' || topic == 'titles' ) {
// 			var reg = new RegExp('\\W',"g");
			id='_'+ escape(category) ;
		}
		return id;
	}

  this.selectTopicCategory = function (topic,category,topicdiv) {
    if ( topic == 'genres') {
      $('select option[value='+category+']',topicdiv).attr('selected','selected');
    } else if ( topic == 'artists' && category != '<all>' ) {
      $('input[name=artist]',topicdiv).val(category);
    } else if ( topic == 'albums' ) {
      $('input[name=album]',topicdiv).val(category);
    } else if ( topic == 'titles' ) {
      $('input[name=title]',topicdiv).val(category);
    }
    return topicdiv;
  }

	var getSelectedTopicCategory = function (topic, topicdiv ) {
		if ( topic == 'genres') {
		return $('select',topicdiv).val();
		} else if ( topic == 'artists' ) {
		var widget = $('input[name=artist]',topicdiv);
		if ( widget.val() == widget.attr("defaultvalue") ) { return ""; }
		return widget.val();
		} else if ( topic == 'albums' ) {
		var widget = $('input[name=album]',topicdiv);
		if ( widget.val() == widget.attr("defaultvalue") ) { return ""; }
		return widget.val();
		} else if ( topic == 'titles' ) {
		var widget = $('input[name=title]',topicdiv);
		if ( widget.val() == widget.attr("defaultvalue") ) { return ""; }
		return widget.val();
		}
		return null;
	}

	var checkPagerFreshness = function(node) {
		var pager = node.data("pager");
		if ( !pager )	return ;
		debug("pager refresh ?");
		pager.checkCache(function() { 
			var refresh = $(d10.mustacheView("refresh"));
			refresh.one("click",function() {
				pager.display_page(1);
				refresh.remove();
			});
			refresh.appendTo(node.find("article")).fadeIn("slow");
		});

	};


	var mm = this.router = new d10.fn.menuManager ({
		'menu': $('>nav',ui),
		'container': ui,
		'active_class': 'active',
		'property': 'name',
		'effects': false,
    "routePrepend":["library"],
    "useRouteAPI": true
	});

	mm.bind("subroute", function (e,data) {
// 		debug("library subroute : ",data);	
		var cat = data.segments.length ? data.segments[0] : "";
		that.init_topic(data.label,cat);
	});

	$(document).bind("route.library",function(e,data) {
	//     debug("librry document binding",data.segments);
// 		debug("library route : ",data);	
		var routes = ["artists", "albums", "genres", "titles","creations", "hits"];
		if ( !data.segments.length ||  routes.indexOf(data.segments[0]) < 0 ) { 
			if ( !mm.current_label() ) {
				mm.route( ["creations"], data.env );
			} else {
				setTimeout(function() {
// 					debug("visible : ",$("#library div.topic_category:visible"));
					checkPagerFreshness($("#library div.topic_category:visible"));
				},2000);
			}
			return ;
		}
		mm.route( data.segments, data.env );
	});

};

d10.library = new library();
delete library;

});