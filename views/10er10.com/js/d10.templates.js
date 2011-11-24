define(["js/user", "js/localcache"],function(user, localcache) {
	function mustacheView (a,b,c) {
		return Mustache.to_html( localcache.getTemplate(a), b, c );
	};

	function song_template (doc) {
		var d = new Date(1970,1,1,0,0,doc.duration);
		doc.human_length = d.getMinutes()+':'+d.getSeconds();
		
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