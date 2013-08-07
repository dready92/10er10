(function() {
angular.module("d10artist",[])
.directive("d10artistListItem", function() {
  return {
    restrict: "A",
    templateUrl: "../html/rc/artist/listItem.html",
    replace: true
  };
})
.factory("_d10artistFetch", ["d10albumDataParser",
         function(d10albumDataParser) {
    var rest = require("js/d10.rest");
    return function(artist, callback) {
      var rest = require("js/d10.rest");
      rest.artist.songsByAlbum(
        artist,
        {
          load: function(err,resp) {
            if ( err ) {
              return callback(err);
            }
            var albums = {}, noAlbum = [];
            var artistData = {albums: [], noAlbum: null, duration: 0, mainImage: null};
            resp.forEach(function(row) {
              if ( !row.doc.album ) {
                noAlbum.push(row);
                return ;
              }
              if ( !(row.doc.album in albums) ) {
                albums[row.doc.album] = [];
              }
              albums[row.doc.album].push(row);
            });
            for ( var i in albums ) {
              var album = d10albumDataParser(albums[i]);
              artistData.duration+=album.duration;
              artistData.mainImage = album.mainImage;
              album.title = album.songs[0].album;
              artistData.albums.push(album);
            }
            if ( noAlbum.length ) {
              artistData.duration+=noAlbum.duration;
              artistData.noAlbum = d10albumDataParser(noAlbum)
            }
            return callback(null, artistData);
          }
        }
      );
    }
  }])
  .factory("d10artistSongCache",["d10songsCache", function(d10songsCache) {
    return function (artistData) {
      var songsForCache = [];
      for (var i = 0; i<artistData.albums.length; i++) {
        songsForCache = songsForCache.concat(artistData.albums[i].songs);
      }
      if ( artistData.noAlbum 
            && artistData.noAlbum.songs 
            && artistData.noAlbum.songs.length ) {
        songsForCache = songsForCache.concat(artistData.noAlbum.songs);
      }
      d10songsCache.set("artist",songsForCache);
    };
  }])
  .factory("d10artistFetch", ["_d10artistFetch","d10artistSongCache",
         function(_d10artistFetch, d10artistSongCache) {
    return function(artist, options, callback) {
      var settings={
        cacheSongs: true
      };
      if ( arguments.length < 3 ) {
        callback = options;
        options = {};
      }
      angular.extend(settings, options);
      _d10artistFetch(artist,function(err,resp) {
        if(err) {
          return callback(err,resp);
        }
        if ( settings.cacheSongs ) {
          d10artistSongCache(resp);
        }
        return callback(err,resp);
      });
    };
  }
])
.controller("d10artistPageController", ["$scope","$routeParams","d10artistFetch", "d10rc",
            function($scope, $routeParams, d10artistFetch, d10rc) {
  $scope.name = decodeURIComponent($routeParams.name);
  $scope.titleList = {toggleControls: false};
  d10artistFetch($scope.name, function(err,artist) {
    if ( err ) {
      return ;
    }
    $scope.safelyApply(function() {
      $scope.artist = artist;
    });
  });
}])
;

})();