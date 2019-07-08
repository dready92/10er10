// eslint-disable-next-line import/no-amd
define(["js/d10.templates", "js/config", "js/user", "js/d10.rest"], function(tpl, config, user, rest) {
	
	
	var couchMapMergedCursor = function(endpoint,queryData, mergeField) {
		var innerCursor = new couchMapCursor(endpoint, queryData);
		var buffer = [];
		var merged = [];
		var rpp = config.rpp;
		var mergedRpp = 10;

		var innerCursorFetchUntilRpp = function(then) {
            if (buffer.length && !innerCursor.hasMoreResults()) {
              merged.push(buffer);
              buffer = [];
            }
			if ( !innerCursor.hasMoreResults() || merged.length >= mergedRpp ) {
				var back = merged.splice(0,mergedRpp);
				return then(back);
			} else {
				innerCursorFetch(function(err,resp) {
					if ( err ) {
						return then([]);
					} else {
						return innerCursorFetchUntilRpp(then);
					}
				});
			}
		};
		
		var innerCursorFetch = function(cb) {
			innerCursor.getNext(function(err,resp) {
				if ( err ) {
					merged = [];
					buffer = [];
					return cb(err,resp);
				} else {
					var currentFieldValue ;
					if ( buffer.length ) {
						currentFieldValue = buffer[0].doc[mergeField];
					} else if ( resp.length ) {
						currentFieldValue = resp[0].doc[mergeField];
					}
					for (var i in resp ) {
						if ( resp[i].doc[mergeField] == currentFieldValue ) {
							buffer.push(resp[i]);
						} else {
							merged.push(buffer);
							buffer = [resp[i]];
							currentFieldValue = resp[i].doc[mergeField];
						}
					}
					cb();
				}
			});
		};
		
		var getResults = function(cb) {
			if ( !innerCursor.hasMoreResults() ) {
				if ( buffer.length ) {
					merged.push(buffer);
					buffer = [];
				}
				if ( merged.length ) {
					var localMerged = merged;
					merged = [];
					return cb(null,localMerged);
				} else {
					return cb(null,null);
				}
			} else {
				innerCursorFetchUntilRpp(function(results) {
					return cb(null,results);
				});
			}
		};
		var hasMoreResults = function() {
			return innerCursor.hasMoreResults() || merged.length || buffer.length;
		}
		this.hasMoreResults = hasMoreResults;
		this.getNext = getResults;
	};
	
	function mongoPagedCursor(endpoint, queryData) {
		const actualData = $.extend({ offset: 0 }, queryData);
		const rpp = actualData.limit ? actualData.limit : config.rpp;
		let endOfStream = false;
		actualData.limit = rpp;

		this.hasMoreResults = function () { return !endOfStream; }
		this.getNext = nextResults;

		function nextResults(cb) {
			endpoint(actualData, {
				load(err, resp) {
					let lastResult;
					if (err) {
						endOfStream = true;
						cb(err, resp);
					} else if (!Array.isArray(resp)) {
						endOfStream = true;
						cb(999, resp);
					} else {
						incrementCursor(resp, cb);
					}
				}
			});
		}

		function incrementCursor(resp, cb) {
			if (resp.length < rpp) {
				endOfStream = true;
			} else {
				resp.pop();
				actualData.offset = actualData.offset + rpp - 1;
			}
			cb(null, resp);
		}
	}

	var couchMapCursor = function(endpoint, queryData) {
		var actualData = $.extend({},queryData);
		var rpp = actualData.limit ? actualData.limit : config.rpp;
        actualData.limit = rpp;
		var endOfStream = false;
		var getResults = function(cb) {
			endpoint(actualData, {
				load: function(err,resp) {
					var lastResult ;
					if ( err ) {
						endOfStream = true;
						cb(err,resp);
					} else if ( !$.isArray(resp) ) {
						endOfStream = true;
						cb(999,resp);
					} else {
						if ( resp.length < rpp ) {
							endOfStream = true;
						} else {
							lastResult = resp.pop();
							actualData.startkey = JSON.stringify( lastResult.key );
                            if ( "doc" in lastResult && "_id" in lastResult.doc ) {
                              actualData.startkey_docid = lastResult.doc._id;
                            }
						}
						cb(null,resp);
					}
				}
			});
		};
		this.hasMoreResults = function() { return !endOfStream ;}
		this.getNext = getResults;
	};
	
	var emulatedCursor = function(data) {
		var rpp = config.rpp;
		
		this.getNext = function(cb) {
			if ( !data.length ) {
				cb();
			} else {
				if ( data.length > rpp ) {
					cb(null,data.splice(0,rpp));
				} else {
					cb(null,data.splice(0,data.length));
				}
			}
		};
		
		this.hasMoreResults = function() {
			debug("hasMoreResults: ", (data.length > 0));
			return (data.length > 0);
		};
	};
	
	$.fn.d10scroll = function(cursor, list, options) {
		options = options || {};
		var widget = this;
		var settings = {
            fetchToFill: false,
			pxMin: 50,
			onContent: function() {},
			onEnd: function() {},
			onFirstContent: function() {},
			onQuery: function() {},
			parseResults: function(rows) {
				return tpl.song_template(rows);
				/*var html="";
				rows.forEach(function(v) { html+=tpl.song_template(v.doc); });
				return html;*/
			},
            append: function(html) {
              list.append(html);
            }
		};
		$.extend(settings,options);
        var initialLoad = true;
		var ajaxRunning = false;
		var firstRun = true;
		var pxToBottom = function() {
			return widget.prop("scrollHeight") - widget.prop("scrollTop") - widget.outerHeight() ;
		};
		
		
		var onScroll = function() {
// 	 		debug("got scroll event");
// 	 		debug("scrollHeight: ",widget.prop("scrollHeight"),"scrolltop", widget.prop("scrollTop"),"outerHeight", widget.outerHeight() );
			if ( pxToBottom() < settings.pxMin && !ajaxRunning ) { fetchResult(); }
		};
		
		var fetchResult = function() {
			if ( !cursor.hasMoreResults() ) {
				return ;
			}
			ajaxRunning = true;
			settings.onQuery.call(widget);
			cursor.getNext(function(err,resp) {
				if ( err ) { ajaxRunning = false; return; }
				var html=settings.parseResults(resp);
				if ( html.length ) {
					settings.append(html);
				}
				if ( firstRun ) {
					firstRun=false;
					if ( cursor.hasMoreResults() ) {
						widget.bind("scroll",onScroll);
					}
					settings.onFirstContent.call(widget, resp.length);
				} else {
					if ( !cursor.hasMoreResults() ) {
						widget.unbind("scroll",onScroll);
					}
				}
				settings.onContent.call(widget,resp);
				ajaxRunning = false;
                if ( cursor.hasMoreResults() && settings.fetchToFill && initialLoad ) {
                  if ( pxToBottom() < settings.pxMin ) {
                    onScroll();
                  } else {
                    initialLoad = false;
                  }
                }
			});
		};
		
		fetchResult();
		
		return {
			setProperty: function(name,value) { settings[name] = value; },
			getProperty: function(name) { if ( name in settings ) { return settings[name]; } },
			remove: function() { widget.unbind("scroll",onScroll); widget = null; }
		};
	};
	
	
	/*
	 * Infos getter: favorites
	 */
	var favoriteSongsLoader = function(options) {
		var api = {}, jq = $(api), favorites = user.getLikes();
		api.bind = function(){jq.bind.apply(jq,arguments);};
		api.trigger = function(){jq.trigger.apply(jq,arguments);};
		options = options || {};
		var getRows = function() {
			var exit = function () {
				api.trigger("end");
				api = null;
				jq = null;
				return ;
			};
			if ( !favorites.length ) {
				return exit();
			}
			var current = favorites.splice(0,50);
			rest.song.get(current,{load:
				function(err,resp) {
					if ( err ) {
						return exit();
					}
					var selected = ("filter" in options ) ? resp.filter(options.filter) : resp;
					if ( selected.length ) {
						api.trigger("data",selected);
					}
					getRows();
				}
			});
			
		};
		
		setTimeout(getRows, 0);
		return api;
	};
	
	
// scrollHeight: total height in px ( height + padding )
// scrollTop: nb of px hidden from the top
// widget.outerHeight: the visible window

	return {
		couchMapMergedCursor: couchMapMergedCursor,
		couchMapCursor: couchMapCursor,
		emulatedCursor: emulatedCursor,
		favoriteSongsLoader: favoriteSongsLoader,
		mongoPagedCursor: mongoPagedCursor
	};

	
});
