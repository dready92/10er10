(function() {
angular.module("d10album",[])
.directive("d10albumPage", function() {
  return  {
    restrict: "A",
    templateUrl: "../html/rc/album/page.html",
    replace: true
  }
})
.factory("d10albumDataParser", ["d10artistTokenizer", function(d10artistTokenizer) {
  
  function addImages(album, song) {
    if ( !song.images || !song.images.length ) {
      return ;
    }
    song.images.forEach(function(img) {
      var found = false;
      album.images.forEach(function(imgCount) {
        if ( img.filename === imgCount.filename ) {
          imgCount.count++;
          found = true;
        }
      });
      if ( !found ) {
        album.images.push({filename: img.filename, count: 1});
      }
    });
  };
  
  function addArtists(album, song) {
    if ( album.artists.indexOf(song.token.artist) < 0 ) {
      album.artists.push(song.token.artist);
    }
    song.token.artists.forEach(function(artist) {
      if ( album.artists.indexOf(artist) < 0 ) {
        album.artists.push(artist);
      }
    });
  };
  
  function addGenre(album, song) {
    if ( album.genres.indexOf(song.genre) < 0 ) {
      album.genres.push(song.genre);
    }
  };
  
  function appendDuration(album,song) {
    album.duration+=song.duration;
  };
  
  function postProcessImages(album) {
    album.images.sort(function(a,b) {
      if ( a.count < b.count ) {
        return -1;
      } else if ( a.count > b.count ) {
        return 1;
      } else {
        return 0;
      }
    });
    var images = album.images.map(function(i) {return i.filename;});
    album.images = images;
    if ( album.images.length ) {
      album.mainImage = images[ (images.length-1) ];
    } else {
      album.mainImage = null;
    }
  };
  
  return function(rows) {
    var album = {duration: 0, artists: [], genres: [], songs: [], images: []};
    rows.forEach(function(row) {
      var song = row.doc;
      d10artistTokenizer(song);
      addArtists(album, song);
      addGenre(album, song);
      addImages(album, song);
      appendDuration(album, song);
      album.songs.push(song);
    });
    postProcessImages(album);    
    return album;
  };
}])
.factory("d10albumFetch", ["d10songsCache","d10albumDataParser", 
         function(d10songsCache, d10albumDataParser) {
  var rest = require("js/d10.rest");
  return function(album, callback) {
    rest.song.list.albums(
      {
        album: album,
        full: true
      },
      {
        load: function(err,resp) {
          if ( err ) {
            return callback(err);
          }
          var album = d10albumDataParser(resp);
          d10songsCache.set("album",album.songs);
          return callback(null, album);
        }
      }
    );
  };
}])
.controller("d10albumPageController", ["$scope","$routeParams","d10albumFetch",
            function($scope, $routeParams,d10albumFetch) {
  $scope.name = $routeParams.name;
  d10albumFetch($scope.name, function(err,album) {
    if ( err ) {
      return ;
    }
    $scope.safelyApply(function() {
      $scope.album = album;
    });
  });
}])
;



})();