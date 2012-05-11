var sanitizeArtist = function(a) {
  if ( a.indexOf("(") > -1 && a.indexOf(")") < 0 ) {
		a = a.replace("(","");
	} else if ( a.indexOf(")") > -1 && a.indexOf("(") < 0 ) {
		a = a.replace(")","");
	}
	if ( a.indexOf("[") > -1 && a.indexOf("]") < 0 ) {
		a = a.replace("[","");
	} else if ( a.indexOf("]") > -1 && a.indexOf("[") < 0 ) {
		a = a.replace("]","");
	}
	return a.replace(/^\s+/,"").replace(/\s+$/,"")
};

var tokenizeSong = function(doc) {
	var featuring_separator = [ "Featuring ", "featuring ","Feat.", "feat.","Feat ","feat " , "Ft.","ft.", "Ft ","ft ","F/","f/" ];
	var final_artists = [];
	var artists;
	var real_title = doc.title;
	for ( var i in featuring_separator ) {
			var spl = doc.artist.split(featuring_separator[i],2);
			if ( spl.length == 2 ) {
					artists = spl[1].split(",") ;
					var lastartist = artists.pop();
					artists = artists.concat( lastartist.split(/ And | & /) );
					artists.unshift(spl[0].replace(/^\s+/,"").replace(/\s+$/,""));
					final_artists = artists.map(sanitizeArtist);
					break;
			}
	}
	if ( !final_artists.length ) {
			final_artists.push(sanitizeArtist(doc.artist));
	}

	for ( var i in featuring_separator ) {
			var spl = doc.title.split(featuring_separator[i],2);
			if ( spl.length == 2 ) {
					real_title = spl[0].replace(/\s+$/,"");
					artists = spl[1].split(",");
					var lastItem= artists.pop();
					if ( lastItem.substr(-1) == "]" && lastItem.indexOf("[") == -1 ) {
						lastItem = lastItem.slice(0,-1);
						if ( real_title.lastIndexOf("[") == (real_title.length - 1) ) {
						  real_title = real_title.substr(0, real_title.length -2);
						} else {
						  real_title += "]";
						}
					} else if (lastItem.substr(-1) == ")" && lastItem.indexOf("(") == -1) {
						lastItem = lastItem.slice(0,-1);
						if ( real_title.lastIndexOf("(") == (real_title.length - 1) ) {
						  real_title = real_title.substr(0, real_title.length -2);
						} else {
						  real_title += ")";
						}
					}
					
					artists = artists.concat( lastItem.split(/ And | & /) )
						.forEach(function(v) {
							v = sanitizeArtist(v);
							if ( final_artists.indexOf(v) < 0 ) {
								final_artists.push(v);
							}
					});
					break;
			}
	}
	artists = [];
	for ( var i in final_artists ) {
	  if ( artists.indexOf(final_artists[i]) == -1 ) {
		artists.push(final_artists[i]);
	  }
	}
	return {title: real_title, artists: artists};
};

exports.tokenize = tokenizeSong;