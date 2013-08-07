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
  var imageUtils = require("js/d10.imageUtils");
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
    var images = album.images.map(function(i) {return imageUtils.getImageUrl(i.filename);});
    album.images = images;
    if ( album.images.length ) {
      album.mainImage = images[ (images.length-1) ];
    } else {
      album.mainImage = '/'+imageUtils.getAlbumDefaultImage();
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
.factory("_d10albumFetch", ["d10albumDataParser", function(d10albumDataParser) {
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
          return callback(null, album);
        }
      }
    );
  };
}])
.factory("d10albumSongCache", ["d10songsCache",function(d10songsCache) {
  return function(album) {
    d10songsCache.set("album", album.songs);
  }
}])
.factory("d10albumFetch", ["d10albumSongCache","_d10albumFetch", 
         function(d10albumSongCache, _d10albumFetch) {
  return function(album, options, callback) {
    var settings = {
      cacheSongs: true
    };
    if ( arguments.length < 3 ) {
      callback = options;
      options = {};
    }
    angular.extend(settings, options);
    _d10albumFetch(album, function(err,album) {
      if ( err ) {
        return callback(err,album);
      }
      if ( settings.cacheSongs
          && album.songs
          && album.songs.length
      ) {
        d10albumSongCache(album);
      }
      return callback(err,album);
    });
  };
}])
.controller("d10albumPageController", ["$scope","$routeParams","d10albumFetch", "d10rc",
            function($scope, $routeParams,d10albumFetch, d10rc) {
  function getSongIds() {
    if ( !$scope.album ) {
      return [];
    }
    var ids = $scope.album.songs.map(function(song) {
      return song._id;
    });
    return ids;
  };
  $scope.name = decodeURIComponent($routeParams.name);
  $scope.titleList = {toggleControls: false};
  $scope.appendAlbum = function() {
    if ( !$scope.album ) {
      return false;
    }
    var ids = getSongIds();
    d10rc.appendToPlayerList(ids);
  };
  $scope.playAlbum = function() {
    if ( !$scope.album ) {
      return false;
    }
    var ids = getSongIds();
    d10rc.appendToCurrentAndPlay(ids);
  };
  
  d10albumFetch($scope.name, function(err,album) {
    if ( err ) {
      return ;
    }
    $scope.safelyApply(function() {
      $scope.album = album;
    });
  });
}])
.directive("d10albumListItem", function() {
  return {
    restrict: "A",
    templateUrl: "../html/rc/album/listItem.html",
    replace: true
  };
})
.directive("d10albumPageFragment", function() {
  return {
    restrict: "A",
    templateUrl: "../html/rc/album/pageFragment.html",
    replace: true
  };
});
;



})();