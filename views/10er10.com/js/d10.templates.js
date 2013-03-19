define(["js/user", "js/d10.localcache", "js/d10.artistTokenizer"],function(user, localcache, artistTokenizer) {
	function mustacheView (a,b,c) {
		return Mustache.to_html( localcache.getTemplate(a), b, c );
	};

	function song_template (doc) {
		if ( Object.prototype.toString.call(doc) === '[object Array]' ) {
			var html = "";
			for ( var i in doc ) {
				html+= ( "doc" in doc[i] ) ? song_template(doc[i].doc) : song_template(doc[i]);
			}
			return html;
		}
                doc = JSON.parse(JSON.stringify(doc));
		var d = new Date(1970,1,1,0,0,doc.duration),
	    m = d.getMinutes(), s = d.getSeconds();
		m = m < 10 ? "0"+m : m;
		s = s < 10 ? "0"+s : s;
		doc.human_length = m  + ':' + s;
		
		var images = [];
        var imageAlternatives = {};
		if ( doc.images ) {
			doc.images.forEach(function(img) {
				images.push(img.filename);
                if ( img.alternatives ) {
                  imageAlternatives[img.filename] = img.alternatives;
                }
			});
		}
		doc.images = images.join(",");
        doc.imageAlternatives = JSON.stringify(imageAlternatives);
		if ( doc.user == user.id() ) {
			doc.owner = true;
		}
		if ( doc.sourceFile && doc.sourceFile.type && doc.sourceFile.extension ) {
          doc.originalFile = [ doc.sourceFile ];
        }
		var tokens = artistTokenizer(doc,true);
        var artists = tokens[0];
        doc.title = tokens[1];
        doc.artist = artists.shift();
        doc.gotFeaturing = artists.length ? true : false;
        doc.artists = artists;
        
		return mustacheView('song_template',doc);
	};
	
	function albumMini(data) {
		return mustacheView("library.content.album.all.mini",data);
	};
    
    function secondsToTemplate(seconds, template_data) {
      var mins = Math.floor(seconds / 60);
      template_data.hours = Math.floor( mins/60 );
      template_data.hours = template_data.hours ? [template_data.hours] : [];
      template_data.minutes =  mins - template_data.hours*60;
      template_data.minutes = template_data.minutes < 10 ? "0"+template_data.minutes : template_data.minutes;
    };
	
	
	return {
      mustacheView: mustacheView,
      song_template: song_template,
      albumMini: albumMini,
      secondsToTemplate: secondsToTemplate
	};
});
