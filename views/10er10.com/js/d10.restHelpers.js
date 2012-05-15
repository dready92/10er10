define(["js/d10.templates", "js/config"], function(tpl, config) {
	
	
	var couchMapMergedCursor = function(endpoint,queryData, mergeField) {
		var innerCursor = new couchMapCursor(endpoint, queryData);
		var buffer = [];
		var merged = [];
		var rpp = config.rpp;
		var mergedRpp = 10;
		var onGetResults = function(err,resp,cb) {
			
		};

		var innerCursorFetchUntilRpp = function(then) {
			if ( !innerCursor.hasMoreResults() || merged.length >= mergedRpp ) {
				var back = merged.splice(0,mergedRpp);
				return then(back);
			} else {
				innerCursorFetch(function(err,resp) {
					if ( err ) {
						debug("ERROR returning ",err,merged, buffer);
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
			}
		};
		$.extend(settings,options);
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
					list.append(html);
				}
				if ( firstRun ) {
					firstRun=false;
					if ( cursor.hasMoreResults() ) {
						widget.bind("scroll",onScroll);
					}
					settings.onFirstContent.call(widget, resp.length);
				} else {
// 					debug("cursor have results ? ", cursor.hasMoreResults());
					if ( !cursor.hasMoreResults() ) {
// 						debug("cursor doesn't have results, unbinding scroll");
						widget.unbind("scroll",onScroll);
					}
				}
				settings.onContent.call(widget,resp);
				ajaxRunning = false;
			});
		};
		
		fetchResult();
		
		return {
			setProperty: function(name,value) { settings[name] = value; },
			getProperty: function(name) { if ( name in settings ) { return settings[name]; } },
			remove: function() { widget.unbind("scroll",onScroll); widget = null; }
		};
	};
	
// scrollHeight: total height in px ( height + padding )
// scrollTop: nb of px hidden from the top
// widget.outerHeight: the visible window

	return {
		couchMapMergedCursor: couchMapMergedCursor,
		couchMapCursor: couchMapCursor,
		emulatedCursor: emulatedCursor
	};

	
});
