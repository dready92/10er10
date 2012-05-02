define(["js/user", "js/localcache"],function(user, localcache) {
	function mustacheView (a,b,c) {
		return Mustache.to_html( localcache.getTemplate(a), b, c );
	};

	function song_template (doc) {
		var d = new Date(1970,1,1,0,0,doc.duration),
	    m = d.getMinutes(), s = d.getSeconds();
		m = m < 10 ? "0"+m : m;
		s = s < 10 ? "0"+s : s;
		doc.human_length = m  + ':' + s;
		
		var images = [];
		if ( doc.images ) {
			doc.images.forEach(function(img) {
				images.push(img.filename);
			});
		}
		doc.images = images.join(",");
		if ( doc.user == user.id() ) {
			doc.owner = true;
		}
		return mustacheView('song_template',doc);
	};
	
	
	return {
		mustacheView: mustacheView,
	   song_template: song_template
	};
});