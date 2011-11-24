(function($){
	if ( !window.d10.mustache ) {
			window.d10.mustache = Mustache;
	}

	if ( !window.d10.mustacheView ) {
			window.d10.mustacheView = function (a,b,c) {
					return window.d10.mustache.to_html( window.d10.localcache.getTemplate(a), b, c );
			}
	}

	window.d10.song_template = function (doc) {
		var d = new Date(1970,1,1,0,0,doc.duration);
		doc.human_length = d.getMinutes()+':'+d.getSeconds();
		
		var images = [];
		if ( doc.images ) {
			doc.images.forEach(function(img) {
				images.push(img.filename);
			});
		}
		doc.images = images.join(",");
		if ( doc.user == d10.user.id() ) {
			doc.owner = true;
		}
		return window.d10.mustacheView('song_template',doc);
	}
})(jQuery);