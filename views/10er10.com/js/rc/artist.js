(function() {
angular.module("d10artist",[])
.directive("d10artistListItem", function() {
  return {
    restrict: "A",
    templateUrl: "../html/rc/artist/listItem.html",
    replace: true
  };
})
.factory("d10artistFetch", ["d10songsCache","d10albumDataParser", 
         function(d10songsCache, d10albumDataParser) {
  var rest = require("js/d10.rest");
  return function(artist, callback) {
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
          var songsForCache = [];
          for ( var i in albums ) {
            var album = d10albumDataParser(albums[i]);
            songsForCache = songsForCache.concat(album.songs);
            artistData.duration+=album.duration;
            artistData.mainImage = album.mainImage;
            artistData.albums.push(album);
          }
          if ( noAlbum.length ) {
            songsForCache = songsForCache.concat(noAlbum.songs);
            artistData.duration+=noAlbum.duration;
            artistData.noAlbum = d10albumDataParser(noAlbum)
          }
          d10songsCache.set("artist",songsForCache);
          return callback(null, artistData);
        }
      }
    );
  };
}])
.controller("d10artistPageController", ["$scope","$routeParams","d10artistFetch", "d10rc",
            function($scope, $routeParams, d10artistFetch, d10rc) {
  $scope.name = $routeParams.name;
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