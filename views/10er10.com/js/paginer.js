(function($){
// scrollHeight: total height in px ( height + padding )
// scrollTop: nb of px hidden from the top
// widget.outerHeight: the visible window


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

})(jQuery);