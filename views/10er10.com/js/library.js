(function(d10,$) {

if (! "fn" in d10 ) {
	d10.fn = {};
}
	
	d10.fn.library = function (ui) {

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

		
			
		var init_topic = function (topic,category) {
			debug("library.display start");
			if ( typeof category == "undefined" ) {
				category = "";
			}
			//
			// create topic div + controls (if any)
			//
			var topicdiv = $('div[name='+topic+']',ui);
			if ( topicdiv.length == 0 ) {
				topicdiv=$('<div name="'+topic+'"></div>');
				init_controls(topic,topicdiv);
				ui.append(topicdiv);
			}
			
			if ( topic == "genres" && !category ) { category = "<all>"; }

			//
			//if category is specified select it
			//
			if ( category ) {
				selectTopicCategory(topic,category,topicdiv);
			} else {
				category = getSelectedTopicCategory (topic, topicdiv );
			}

			//
			// launch the topic category display
			//

			//
			// get id
			//
			var id = get_id(topic,topicdiv,category);
			//
			// get topic category container
			//
			var categorydiv=$('div[name="'+id+'"]',topicdiv);
			if ( !categorydiv.length ) {
				if ( topic == "genres" && category == "<all>" ) {
					categorydiv=$('<div name="'+id+'" class="topic_category">'+d10.mustacheView("loading")+d10.mustacheView("library.control.genre")+"</div>");
				} else if ( topic == "genres" ) {
					categorydiv=$('<div name="'+id+'" class="topic_category">'+d10.mustacheView("loading")+d10.mustacheView("library.content.genre")+"</div>");
					categorydiv.find("article h2 > span:first-child").text(category);
					categorydiv.find("article h2 > .link").click(function() { d10.router.navigateTo(["library","genres"]); });
					bindControls(categorydiv, topic, category);
				} else {
					categorydiv=$('<div name="'+id+'" class="topic_category">'+d10.mustacheView("loading")+d10.mustacheView("library.content.simple")+"</div>");
					bindControls(categorydiv, topic, category);
				}
				topicdiv.append(categorydiv);
			}
			
			// special pages
			if ( topic == "artists" && category == "<all>" ) {
				debug("special category case");
				allArtists(categorydiv);
			} else if ( topic == "genres" && category == "<all>" ) {
				displayGenres(categorydiv);
			} else {
				// create the infiniteScroll
				var section = categorydiv.find("section");
				if ( !section.data("infiniteScroll") ) {
					createInfiniteScroll(categorydiv, topic, category);
				}
			}
			//
			// show current topic category if not already visible
			//
			if ( topicdiv.data('activeCategory') != id ) {
				$('div.topic_category',topicdiv).hide();
				categorydiv.show();
				topicdiv.data('activeCategory',id);
			}

		} 

		var getCurrentCategory = function(topic) {
			var topicdiv = ui.children('div[name='+topic+']');
			if ( topicdiv.length == 0 ) {
				return false;
			}
			var back = false;
			topicdiv.find(".topic_category").each(function() {
				if ( $(this).css("display") == "block" ) {
					back = get_category_from_id(topic, $(this).attr("name"));
					return false;
				}
			});
			return back;
		};

		var displayGenres = function(categorydiv) {
			var cacheNotExpired = d10.localcache.getJSON("genres.index");
			if ( cacheNotExpired ) { 
			}
			
			d10.bghttp.get({
				url: site_url+"/api/genresResume",
				dataType: "json",
				success: function(response) {
					d10.localcache.setJSON("genres.index", {"f":"b"},true);
					var content = "";
					$.each(response.data,function(k,v) { //{"key":["Dub"],"value":{"count":50,"artists":["Velvet Shadows","Tommy McCook & The Aggrovators","Thomsons All Stars"]}}
						var artists = "";
						$.each(v.value.artists,function(foo,artist) {
							artists+=d10.mustacheView("library.listing.genre.line", {"artist": artist})
						});
						content+=d10.mustacheView("library.listing.genre", {"genre": v.key[0],"count": v.value.count},  {"artists": artists});
					});
					categorydiv.find("div.genresLanding").html(content);
					categorydiv.find("div.pleaseWait").hide();
					categorydiv.find("div.genresLanding")
					.show()
					.delegate("span.artistName","click",function() {
						d10.router.navigateTo(["library","artists",$(this).text()]);
					})
					.delegate("div.genre > span","click",function() {
						d10.router.navigateTo(["library","genres",$(this).text()]);
					})
					.delegate("span.all","click",function() {
						var genre = $(this).closest("div.genre").children("span").text();
						d10.router.navigateTo(["library","genres",genre]);
					});
				}
			});
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
		
		var bindControls = function(categorydiv, topic, category) {
			categorydiv.find(".pushAll").click(function() {
				d10.playlist.append(categorydiv.find(".song").clone().removeClass("selected"));
			});
			categorydiv.find(".selectVisible").click(function() {
				selectVisible(categorydiv);
			});
			categorydiv.find(".refresh").click(function() {
				categorydiv.find(".song").remove();
				categorydiv.find(".extendedInfos").empty();
				var is = categorydiv.find("section").data("infiniteScroll");
				if ( is && "remove" in is ) {
					is.remove();
				}
				createInfiniteScroll(categorydiv, topic, category);
			});
		};
		
		var createInfiniteScroll = function(categorydiv, topic, category) {
			var section = categorydiv.find("section");
			var url = "/api/list/"+topic;
			var data = {};
			if ( topic == "genres" ) {
				data.genre = category;
			} else if ( topic == "albums" ) {
				data.album = category ? category : "";
			} else if ( topic == "artists" ) {
				data.artist = category ? category : "";
			} else if ( topic == "titles" ) {
				data.title = category ? category : "";
			} else if ( topic != "creations" && topic != "hits" ) {
				return false;
			}
			var loadTimeout = null, 
				innerLoading = categorydiv.find(".innerLoading");
			section.data("infiniteScroll",
				section.infiniteScroll(
					url,
					data,
					section.find(".list"),
					{
						onFirstContent: function(length) {
							categorydiv.find(".pleaseWait").remove();
							categorydiv.find(".songlist").removeClass("hidden");
							if ( !length ) {
								categorydiv.find("article").hide();
								categorydiv.find(".noResult").removeClass("hidden");
								return ;
							}
							
							var list = categorydiv.find(".list");
							// list of items < section height
							if ( list.height() < section.height() )  {
								section.height(list.height()+10);
								section.next(".grippie").hide();
							} else {
								section.next(".grippie").show();
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
										grippie: $(categorydiv).find(".grippie")
									}
															);
							}
							
							if ( d10.fn.library.extendedInfos[topic] ) {
								d10.fn.library.extendedInfos[topic](category,categorydiv);
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
					}
				)
			);
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
				d10.router.navigateTo(["library","artists",$(this).text()]);
			});
		};

		var init_controls = function (topic,catdiv) {
			if ( topic == 'artists' ) {
				catdiv.append( d10.mustacheView('library.control.artist') );
				var widget = $("input[name=artist]",catdiv);
				$("span[name=all]",catdiv).click(function(){ widget.val('').trigger('blur');  d10.router.navigateTo(["library","artists","<all>"]); });
				$('img[name=clear]',catdiv).click(function() { widget.val('').trigger('blur'); d10.router.navigateTo(["library",topic]); });
				widget.val(widget.attr('defaultvalue'))
				.permanentOvlay(d10.rest.artist.list, $(".overlay",catdiv),{
					"autocss": true,
					"minlength" : 1 ,
					"select": function (data, json) {
						d10.router.navigateTo(["library",topic,json]);
						return json;
					},
					"beforeLoad": function() {
						this.getOverlay().width(widget.width());
					},
				});
			} else if ( topic == 'albums' ) {
				catdiv.append( d10.mustacheView('library.control.album') );
				var widget = $('input[name=album]',catdiv);
				widget.val(widget.attr('defaultvalue'))
				.permanentOvlay(d10.rest.album.list, $(".overlay",catdiv),
						{
							"varname": "start", 
							"minlength" : 1 ,
							"autocss": true,
							"select": function (data, json) {
								d10.router.navigateTo(["library",topic,data]);
								return data;
							}
						}
				);
				$('img[name=clear]',catdiv).click(function() { widget.val('').trigger("blur"); d10.router.navigateTo(["library",topic]); });
				
			} else if ( topic == 'titles' ) {
				catdiv.append( d10.mustacheView('library.control.title') );
				var widget = $('input[name=title]',catdiv);
				widget.val(widget.attr('defaultvalue'))
				.permanentOvlay(d10.rest.song.listByTitle, $(".overlay",catdiv), 
					{
						"autocss": true,
						"varname": 'start', 
						"minlength" : 1 ,
						"select": function (data, json) {
							d10.router.navigateTo(["library",topic,data]);
							return data;
						}
					}
				);
				$('img[name=clear]',catdiv).click(function() { widget.val('').trigger("blur"); d10.router.navigateTo(["library",topic]); });
			}
			return catdiv;
		}

		var get_id = function (topic,catdiv,category) {
			var id=topic;
			category = category || '';
			if ( topic == 'genres' || topic == 'artists' || topic == 'albums' || topic == 'titles' ) {
				id='_'+ escape(category) ;
			}
			return id;
		}

		var get_category_from_id = function(topic, id)  {
			if ( topic == 'genres' || topic == 'artists' || topic == 'albums' || topic == 'titles' ) {
				id =  unescape( id.substr(1) ) 
				return id;
			} else {
				return false;
			}
		};

		var selectTopicCategory = function (topic,category,topicdiv) {
			if ( topic == 'artists' && category != '<all>' ) {
				$('input[name=artist]',topicdiv).val(category);
			} else if ( topic == 'albums' ) {
				$('input[name=album]',topicdiv).val(category);
			} else if ( topic == 'titles' ) {
				$('input[name=title]',topicdiv).val(category);
			}
			return topicdiv;
		}

		var getSelectedTopicCategory = function (topic, topicdiv ) {
			if ( topic == 'artists' ) {
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

		return {
			display: init_topic,
			getCurrentCategory: getCurrentCategory
		};
	};














	var parseExtended = function (responses, infos, loading, showHide) {
		var infosParts = 0, infosTemplateData = {};
		for ( var i in responses ) {
			if ( responses[i].data.length ) {
				infosParts++;
				infosTemplateData["part"+infosParts+"title"] = responses[i].title;
			}
		}
		if ( infosParts == 0 ) {
			loading.hide();
			showHide.hide();
			infos.hide();
			return ;
		}
		var template = $(d10.mustacheView("library.content.extended."+infosParts+"part", infosTemplateData)).hide();

		infosParts = 0;
		for ( var i in responses ) {
			if ( responses[i].data.length ) {
				var ul = template.find(".part").eq(infosParts).find("ul");
				$.each(responses[i].data,function(i,v) { ul.append(v); });
				infosParts++;
			}
		}
		template.delegate("li","click",function() {
			d10.router.navigateTo($(this).attr("data-name"));
		});

		infos.append(template);
		if ( loading.length ) {
			if ( loading.is(":visible") ) {
				loading.slideUp("fast",function() {loading.remove();});
			} else {
				loading.remove();
			}
		}
		template.slideDown("fast");
	};
	
	
	d10.fn.library.extendedInfos = {
		genres: function(genre, topicdiv) {
			var hide = topicdiv.find("span.hide");
			var show = topicdiv.find("span.show");
			var loading = topicdiv.find(".extendedInfos .loading");
			var infos = topicdiv.find(".extendedInfos");
			if ( d10.user.get_preferences().hiddenExtendedInfos ) {
				hide.hide();
				show.show();
				infos.hide();
				topicdiv.find(".extendedInfosContainer").show();
			} else {
				hide.show();
				show.hide();
				topicdiv.find(".extendedInfosContainer").slideDown("fast");
			}

			d10.when({
				artists: function(then) {
					d10.bghttp.get({
						url: site_url+"/api/list/genres/artists/"+genre,
						dataType: "json",
						success: function(resp) {
							var back = [];
							for ( var i in resp.data ) {
								back.push($("<li />").html(resp.data[i].key[1])
													.attr("data-name","library/artists/"+encodeURIComponent( resp.data[i].key[1])));
							}
							var data = {title: d10.mustacheView("library.extendedInfos.genre.artists"), data: back};
							then(null,data);
						},
						error: function(err) {
							then(err);
						}
					});
				},
				albums: function(then) {
					d10.bghttp.get({
						url: site_url+"/api/list/genres/albums/"+genre,
						dataType: "json",
						success: function(resp) {
							var back = [];
							for ( var i in resp.data ) {
								back.push($("<li />").html(resp.data[i].key[1]+" ("+resp.data[i].value+" songs)")
													.attr("data-name","library/albums/"+encodeURIComponent(resp.data[i].key[1])));
							}
							var data = {title: d10.mustacheView("library.extendedInfos.genre.albums"), data: back};
							then(null,data);
						},
						error: function(err) {
							then(err);
						}
					});
				}
			},
			function(errs,responses) {
				parseExtended(responses, infos, loading, topicdiv.find(".showHideExtended") );
			});
			hide.click(function() {
				infos.slideUp("fast");
				hide.slideUp("fast",function() {
					show.slideDown("fast");
				});
				d10.user.set_preference("hiddenExtendedInfos",true);
			});
			show.click(function() {
				infos.slideDown("fast");
				show.slideUp("fast",function() {
					hide.slideDown("fast");
				});
				d10.user.set_preference("hiddenExtendedInfos",false);
			});
		},
		artists: function(artist,topicdiv) {
			if ( !artist || !artist.length ) {
				topicdiv.find(".showHideExtended").remove();
				topicdiv.find(".extendedInfosContainer").remove();
				return ;
			}
			var show = topicdiv.find(".show");
			var hide = topicdiv.find(".hide");
			var loading = topicdiv.find(".extendedInfos .loading");
			var infos = topicdiv.find(".extendedInfos");
			if ( d10.user.get_preferences().hiddenExtendedInfos ) {
				hide.hide();
				show.show();
				infos.hide();
				topicdiv.find(".extendedInfosContainer").show();
			} else {
				hide.show();
				show.hide();
				topicdiv.find(".extendedInfosContainer").slideDown("fast");
			}
			topicdiv.find(".showHideExtended").removeClass("hidden");

			
			d10.when({
				artists: function(then) {
					d10.bghttp.get({
						url: site_url+"/api/relatedArtists/"+ encodeURIComponent(artist),
						dataType: "json",
						data: {weighted: "true"},
						success: function(resp) {
							debug(resp);
							var back = [], sorted = [], source;
							if ( d10.count(resp.data.artistsRelated) ) {
								source = resp.data.artistsRelated;
							} else {
								source = resp.data.artists;
							}
							for ( var i in source ) {
								var currentArtist = { artist: i, weight: source[i] },
									added = false;
								
								for (var j in sorted ) {
									if ( sorted[j].weight < currentArtist.weight ) {
										sorted.splice(j,0,currentArtist);
										added = true;
										break;
									}
								}
								if ( !added ) { sorted.push(currentArtist); }
							}
							debug(sorted);
							for ( var  i in sorted ) {
								back.push( $("<li />").html(sorted[i].artist)
									.attr("data-name","library/artists/"+ encodeURIComponent(sorted[i].artist)) );
							}

							var data = {title: d10.mustacheView("library.extendedInfos.artist.artists"), data: back};
							then(null,data);
						},
						error: function(err) {
							then(err);
						}
					});
				},
				albums: function(then) {
					d10.bghttp.get({
						url: site_url+"/api/list/artists/albums/"+ encodeURIComponent(artist),
						dataType: "json",
						success: function(resp) {
							var back = [];
							for ( var i in resp.data ) {
								back.push( $("<li />").html(resp.data[i].key[1])
													.attr("data-name","library/albums/"+ encodeURIComponent(resp.data[i].key[1])) );
							}
							var data = {title: d10.mustacheView("library.extendedInfos.artist.albums"), data: back};
							then(null,data);
						},
						error: function(err) {
							then(err);
						}
					});
				},
				genres: function(then) {
					d10.bghttp.get({
						url: site_url+"/api/list/artists/genres/"+ encodeURIComponent(artist),
						dataType: "json",
						success: function(resp) {
							var back = [];
							for ( var i in resp.data ) {
								back.push( $("<li />").html(resp.data[i].key[1])
													.attr("data-name","library/genres/"+ encodeURIComponent(resp.data[i].key[1])) );
							}
							var data = {title: d10.mustacheView("library.extendedInfos.artist.genres"), data: back};
							then(null,data);
						},
						error: function(err) {
							then(err);
						}
					});
				}
			},
			function(errs,responses) {
				parseExtended(responses, infos, loading, topicdiv.find(".showHideExtended") );
			});
			hide.click(function() {
				infos.slideUp("fast");
				hide.slideUp("fast",function() {
					show.slideDown("fast");
				});
				d10.user.set_preference("hiddenExtendedInfos",true);
			});
			show.click(function() {
				infos.slideDown("fast");
				show.slideUp("fast",function() {
					hide.slideDown("fast");
				});
				d10.user.set_preference("hiddenExtendedInfos",false);
			});
		},
		albums: function(album,topicdiv) {
			if ( !album || !album.length ) {
				topicdiv.find(".showHideExtended").remove();
				topicdiv.find(".extendedInfosContainer").remove();
				return ;
			}
			var show = topicdiv.find(".show");
			var hide = topicdiv.find(".hide");
			var loading = topicdiv.find(".extendedInfos .loading");
			var infos = topicdiv.find(".extendedInfos");
			if ( d10.user.get_preferences().hiddenExtendedInfos ) {
				hide.hide();
				show.show();
				infos.hide();
				topicdiv.find(".extendedInfosContainer").show();
			} else {
				hide.show();
				show.hide();
				topicdiv.find(".extendedInfosContainer").slideDown("fast");
			}
			topicdiv.find(".showHideExtended").removeClass("hidden");
			
			d10.when({
				artists: function(then) {
					d10.bghttp.get({
						url: site_url+"/api/list/albums/artists/"+ encodeURIComponent(album),
						dataType: "json",
						success: function(resp) {
							var back = [];
							for ( var i in resp.data ) {
								back.push( $("<li />").html(resp.data[i].key[1])
													.attr("data-name","library/artists/"+ encodeURIComponent(resp.data[i].key[1])) );
							}
							if ( back.length == 1 ) {
								back = [];
							}
							var data = {title: d10.mustacheView("library.extendedInfos.album.artists"), data: back};
							then(null,data);
						},
						error: function(err) {
							then(err);
						}
					});
				}
			},
			function(errs,responses) {
				parseExtended(responses, infos, loading, topicdiv.find(".showHideExtended") );
			});
			hide.click(function() {
				infos.slideUp("fast");
				hide.slideUp("fast",function() {
					show.slideDown("fast");
				});
				d10.user.set_preference("hiddenExtendedInfos",true);
			});
			show.click(function() {
				infos.slideDown("fast");
				show.slideUp("fast",function() {
					hide.slideDown("fast");
				});
				d10.user.set_preference("hiddenExtendedInfos",false);
			});
		}
	};










})( window.d10 ? window.d10 : {}  , jQuery) ;

$(document).one("bootstrap:router",function() {
// 	debug("bootstrapping router");
	var library = d10.library = d10.fn.library($('#library')),
	libraryRouteHandler = function(topic,category) {
		if ( !topic ) {
			if ( this._containers["library"].currentActive ) {
				this._activate("main","library",this.switchMainContainer);
				return ;
			} else {
				topic = "hits";
			}
		}
		library.display( decodeURIComponent(topic), category ? decodeURIComponent(category) : null );
		this._activate("main","library",this.switchMainContainer)._activate("library",topic);
	};
	d10.router._containers["library"] = 
	{
		tab: $("#library > nav > ul"), 
		container: $("#library"), 
		select: function(name) {return this.container.children("div[name="+name+"]"); }, 
		lastActive: null, 
		currentActive: null
	};
	
	d10.router.route("library","library",libraryRouteHandler);
	d10.router.route("library/:topic","library",libraryRouteHandler);
	d10.router.route("library/:topic/:category","library",libraryRouteHandler);
	
	d10.router._containers.library.tab.delegate("[action]","click",function() {
		var elem = $(this), action = elem.attr("action"), currentCategory = library.getCurrentCategory(action);
		
		if ( ! elem.hasClass("active") ) { 
			if ( currentCategory ) {d10.router.navigateTo(["library",action,currentCategory]); } 
			else { d10.router.navigateTo(["library",action]); }
		}
	});

	
});
