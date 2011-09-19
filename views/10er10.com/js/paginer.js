(function($){
	
	
	d10.fn.couchMapCursor = function(endpoint, queryData) {
		var originalData = queryData || {};
		var actualData = $.extend({},queryData);
		actualData.limit = rpp;
// 		actualData.startkey = null;
// 		actualData.startkey_docid = null;
		var rpp = d10.config.rpp;
		var endOfStream = false;
		var getResults = function(cb) {
			endpoint(actualData, {
				load: function(err,resp) {
// 					debug("couchMapCursor: ",err,resp);
					var lastResult ;
					if ( err ) {
						endOfStream = true;
						cb(err,resp);
					} else if ( !$.isArray(resp) ) {
						endOfStream = true;
						cb(999,resp);
					} else {
// 						debug("couchMapCursor: all good");
						if ( resp.length < rpp ) {
							endOfStream = true;
						} else {
							lastResult = resp.pop();
							actualData.startkey = JSON.stringify( lastResult.key );
							actualData.startkey_docid = lastResult.doc._id;
						}
// 						debug("couchMapCursor: launch callback",err,resp);
						cb(null,resp);
					}
				}
			});
		};
		
		this.hasMoreResults = function() { return !endOfStream ;}
		this.getNext = getResults;
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
				var html="";
				rows.forEach(function(v) { html+=d10.song_template(v.doc); });
				return html;
			}
		};
		$.extend(settings,options);
		var ajaxRunning = false;
		var firstRun = true;
		var pxToBottom = function() {
			return widget.prop("scrollHeight") - widget.prop("scrollTop") - widget.outerHeight() ;
		};
		
		
		var onScroll = function() {
	// 		debug("got scroll event");
	// 		debug("scrollHeight: ",widget.prop("scrollHeight"),"scrolltop", widget.prop("scrollTop"),"outerHeight", widget.outerHeight() );
			if ( pxToBottom() < settings.pxMin && !ajaxRunning ) { fetchResult(); }
		};
		
		var fetchResult = function() {
			if ( !cursor.hasMoreResults() ) {
				return ;
			}
			ajaxRunning = true;
			settings.onQuery.call(widget);
			cursor.getNext(function(err,resp) {
// 				debug("d10scroll: ",err,resp);
				if ( err ) { ajaxRunning = false; return; }
				var html=settings.parseResults(resp);
				if ( html.length ) {
					list.append(html);
				}
				if ( firstRun ) {
					if ( cursor.hasMoreResults() ) {
						widget.bind("scroll",onScroll);
					}
					settings.onFirstContent.call(widget, resp.length);
				} else {
					if ( !cursor.hasMoreResults() ) {
						widget.unbind("scroll",onScroll);
					}
				}
				settings.onContent.call(widget);
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
/*
$.fn.infiniteScroll = function(url, queryData, list, options) {
	queryData = queryData || {};
	options = options || {};
	var widget = this;
	
	var settings = {
		pxMin: 50,
		onContent: function() {},
		onEnd: function() {},
		onFirstContent: function() {},
		onQuery: function() {},
		parseResults: function(rows) {
			var html="";
			rows.forEach(function(v) { html+=d10.song_template(v.doc); });
			return html;
		}
	};
	
	$.extend(settings,options);
	
	var ajaxRunning = false;
	var nextQueryData = {};
	
	var pxToBottom = function() {
		return widget.prop("scrollHeight") - widget.prop("scrollTop") - widget.outerHeight() ;
	};
	
	
	var onScroll = function() {
// 		debug("got scroll event");
// 		debug("scrollHeight: ",widget.prop("scrollHeight"),"scrolltop", widget.prop("scrollTop"),"outerHeight", widget.outerHeight() );
		if ( pxToBottom() < settings.pxMin && !ajaxRunning ) { fetchResult(); }
	};
	
	var fetchResult = function(first) {
		if ( ajaxRunning ) { return ; }
		ajaxRunning = true;
		settings.onQuery.call(widget);
		d10.bghttp.get({
			url: url,
			data: $.extend(nextQueryData, queryData),
			dataType: "json",
			success: function(response) {
				if ( !widget ) { return ; }
				var last = null;
				if ( response.data.length <  (d10.config.rpp + 1) ) {
// 					debug("unbinding scroll event");
					widget.unbind("scroll",onScroll);
				} else {
					last = response.data.pop();
					nextQueryData = {
						startkey: JSON.stringify(last.key),
						startkey_docid: last.id
					};
// 					debug("next query: ",nextQueryData);
				}
				var html=settings.parseResults(response.data);
// 				response.data.forEach(function(v) { html+=d10.song_template(v.doc); });
				if ( html.length ) {
					list.append(html);
				}
				if ( first ) {
					if ( last ) { widget.bind("scroll",onScroll); }
					settings.onFirstContent.call(widget, response.data.length);
				}
				settings.onContent.call(widget);
				ajaxRunning = false;
			}
		});
	};
	
	fetchResult(true);
	
	return {
		setProperty: function(name,value) { settings[name] = value; },
		getProperty: function(name) { if ( name in settings ) { return settings[name]; } },
		remove: function() { widget.unbind("scroll",onScroll); widget = null; }
	};
};
*/
})(jQuery);