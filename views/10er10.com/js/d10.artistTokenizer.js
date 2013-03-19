define([], function() {

  var getArtists = function(doc, no_full_artist) {
      var featuring_separator = [ "Featuring ", "Feat.","Feat ", "Ft.", "Ft ","F/" ];
      var final_artists = [];
      var artists;

      for ( var i in featuring_separator ) {
              var spl = doc.artist.split(featuring_separator[i],2);
              if ( spl.length == 2 ) {
                      artists = spl[1].split(",") ;
                      var lastartist = artists.pop();
                      artists = artists.concat( lastartist.split(/ And | & /) );
                      artists.unshift(spl[0].replace(/^\s+/,"").replace(/\s+$/,""));
                      final_artists = artists;
                      break;
              }
      }
      if ( !final_artists.length ) {
              final_artists.push(doc.artist);
      }
      var title = doc.title;
      for ( var i in featuring_separator ) {
              var spl = doc.title.split(featuring_separator[i],2);
              if ( spl.length == 2 ) {
                      title = spl[0].replace(/^\s+/,"").replace(/\s+$/,"");
                      if ( title.substr(-1) == "[" || title.substr(-1) == "(" ) {
                        title = title.substr(0, (title.length-1));
                      }
                      artists = spl[1].split(",");
                      var lastItem= artists.pop();
                      if ( 
                          (lastItem.substr(-1) == "]" && lastItem.indexOf("[") == -1 ) ||
                          (lastItem.substr(-1) == ")" && lastItem.indexOf("(") == -1 )
                      ) {
                          lastItem = lastItem.slice(0,-1);
                      }

                      artists = artists.concat( lastItem.split(/ And | & /) )
                          .forEach(function(v) {
                              if ( final_artists.indexOf(v) < 0 ) {
                                  final_artists.push(v);
                              }
                      });
                      break;
              }
      }

      var allArtists = [];
      final_artists.forEach(function(a) {
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
          allArtists.push(a.replace(/^\s+/,"").replace(/\s+$/,""));
      });
      final_artists = allArtists;
      if ( !no_full_artist && final_artists.indexOf(doc.artist) < 0 ) { final_artists.push(doc.artist) };
      return [final_artists, title];
  }
  return getArtists;
});