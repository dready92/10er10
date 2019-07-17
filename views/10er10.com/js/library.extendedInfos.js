define(["js/d10.templates","js/user","js/d10.rest", "js/d10.when", "js/d10.toolbox", "js/d10.router"],function(tpl,user,rest, When, toolbox, router) {

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
		var template = $(tpl.mustacheView("library.content.extended."+infosParts+"part", infosTemplateData)).hide();

		infosParts = 0;
		for ( var i in responses ) {
			if ( responses[i].data.length ) {
				var ul = template.find(".part").eq(infosParts).find("ul");
				$.each(responses[i].data,function(i,v) { ul.append(v); });
				infosParts++;
			}
		}
		template.delegate("li","click",function() {
			router.navigateTo($(this).attr("data-name"));
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

    
    var bindHideShowExtendedInfos = function(topicdiv) {
      var hide = topicdiv.find("span.hide");
      var show = topicdiv.find("span.show");
      if ( user.get_preferences().hiddenExtendedInfos ) {
        hide.hide();
        show.show();
        infos.hide();
        topicdiv.find(".extendedInfosContainer").show();
      } else {
        hide.show();
        show.hide();
        topicdiv.find(".extendedInfosContainer").slideDown("fast");
      }
      hide.click(function() {
        infos.slideUp("fast");
        hide.slideUp("fast",function() {
          show.slideDown("fast");
        });
        user.set_preference("hiddenExtendedInfos",true);
      });
      show.click(function() {
        infos.slideDown("fast");
        show.slideUp("fast",function() {
          hide.slideDown("fast");
        });
        user.set_preference("hiddenExtendedInfos",false);
      });
    };

	var extendedInfos = {
		genres: function(genre, topicdiv) {
          
            rest.genre.genreResume(genre, {
              load: function(err,data) {
                if ( err ) { return }
                var widget = topicdiv.find(".subtitle");
                widget.find(".songs").text( data.songs.count );
                widget.find(".artists").text( data.artists );
                widget.find(".albums").text( data.albums );
                widget.fadeIn();
                
              }
            });
          
          
            bindHideShowExtendedInfos(topicdiv);
			var loading = topicdiv.find(".extendedInfos .loading");
			var infos = topicdiv.find(".extendedInfos");
			When({
				artists: function(then) {
					rest.genre.artists(genre, {}, {
						load: function(err, data) {
							if ( err )	return then(err);
							var back = {title: tpl.mustacheView("library.extendedInfos.genre.artists"), data: []};
							for ( var i in data ) {
								back.data.push($("<li />").html(data[i])
													.attr("data-name","library/artists/"+encodeURIComponent( data[i])));
							}
							then(null,back);
						}
					});
				},
				albums: function(then) {
					rest.genre.albums(genre, {
						load: function(err, data) {
							if ( err ) { return then(err); }
							var back = {title: tpl.mustacheView("library.extendedInfos.genre.albums"), data: []};
							for ( var i in data ) {
								back.data.push($("<li />").html(data[i].album+" ("+data[i].count+" songs)")
													.attr("data-name","library/albums/"+encodeURIComponent(data[i].album)));
							}
							then(null,back);
						},
					});
				}
			},
			function(errs,responses) {
				parseExtended(responses, infos, loading, topicdiv.find(".showHideExtended") );
			});
		},
		artists: function(artist,topicdiv) {
			if ( !artist || !artist.length ) {
				topicdiv.find(".showHideExtended").remove();
				topicdiv.find(".extendedInfosContainer").remove();
				return ;
			}
			bindHideShowExtendedInfos(topicdiv);
			var loading = topicdiv.find(".extendedInfos .loading");
			var infos = topicdiv.find(".extendedInfos");
			topicdiv.find(".showHideExtended").removeClass("hidden");

			
			When({
				artists: function(then) {
					rest.artist.related(artist,{
						load: function(err, data) {
							if ( err ) { return then(err); }
							var back = [], sorted = [], source;
							if ( toolbox.count(data.artistsRelated) ) {
								source = data.artistsRelated;
							} else {
								source = data.artists;
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
	// 							debug(sorted);
							for ( var  i in sorted ) {
								back.push( $("<li />").html(sorted[i].artist)
									.attr("data-name","library/artists/"+ encodeURIComponent(sorted[i].artist)) );
							}

							then(null,{title: tpl.mustacheView("library.extendedInfos.artist.artists"), data: back});
						}
					});
				},
				albums: function(then) {
					rest.artist.albums(artist,{
						load: function(err, data) {
							if ( err ) { return then(err);}
							var back = [];
							for ( var i in data ) {
								back.push( $("<li />").html(data[i].key[1])
													.attr("data-name","library/albums/"+ encodeURIComponent(data[i].key[1])) );
							}
							then(null,{title: tpl.mustacheView("library.extendedInfos.artist.albums"), data: back});
						},
						error: function(err) {
							then(err);
						}
					});
				},
				genres: function(then) {
					rest.artist.genres(artist,{
						load: function(err,data) {
							if (err) { return then(err); }
							var back = [];
							for ( var i in data ) {
								back.push( $("<li />").html(data[i].key[1])
													.attr("data-name","library/genres/"+ encodeURIComponent(data[i].key[1])) );
							}
							then(null,{title: tpl.mustacheView("library.extendedInfos.artist.genres"), data: back});
						}
					});
				}
			},
			function(errs,responses) {
				parseExtended(responses, infos, loading, topicdiv.find(".showHideExtended") );
			});
		},
		albums: function(album,topicdiv) {
			if ( !album || !album.length ) {
				topicdiv.find(".showHideExtended").remove();
				topicdiv.find(".extendedInfosContainer").remove();
				return ;
			}
			bindHideShowExtendedInfos(topicdiv);
			var loading = topicdiv.find(".extendedInfos .loading");
			var infos = topicdiv.find(".extendedInfos");
			topicdiv.find(".showHideExtended").removeClass("hidden");

            When({
				artists: function(then) {
					rest.album.artists(album,{
						load: function(err, data) {
							if ( err ) { return then(err); }
							var back = [];
							for ( var i in data ) {
								back.push( $("<li />").html(data[i].key[1])
													.attr("data-name","library/artists/"+ encodeURIComponent(data[i].key[1])) );
							}
							if ( back.length == 1 ) {
								back = [];
							}
							then(null,{title: tpl.mustacheView("library.extendedInfos.album.artists"), data: back});
						}
					});
				}
			},
			function(errs,responses) {
				parseExtended(responses, infos, loading, topicdiv.find(".showHideExtended") );
			});
		}
	};
	return extendedInfos;
});
