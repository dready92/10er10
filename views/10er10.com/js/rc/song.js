(function() {
  
  angular.module("d10song",[])
  .factory("d10artistTokenizer", function() {
    var at = require("js/d10.artistTokenizer");
    return function tokenizer(doc) {
      if ( angular.isArray(doc) ) {
        doc.forEach(function(d) {
          tokenizer(d);
        });
        return ;
      }
      var tokens = at(doc,true);
      doc.token = {
      title: tokens[1],
      artist: tokens[0].shift(),
      artists: tokens[0]
      };
      return doc;

    }
  })
  .factory("d10songFetch", ["d10songsCache", "d10artistTokenizer",function(d10songsCache, d10artistTokenizer) {
    var rest = require("js/d10.rest");
    return function(id, callback) {
      var cached = d10songsCache.get(id);
      if ( cached ) {
        return callback(null, cached);
      }
      rest.song.get(id, {
        load: function(err,resp) {
          if ( err ) {
            return callback(err);
          }
          d10artistTokenizer(resp);
          return callback(null,resp);
        }
      });
    };
  }])
  .filter("d10songImage", function() {
    var imageUtils = require("js/d10.imageUtils");
    var anonymousImage = '/'+imageUtils.getAlbumDefaultImage();
    return function d10songImage(input) {
      if ( input && input.images && input.images.length ) {
        return imageUtils.getImageUrl(input.images[0].filename);
      } else {
        return anonymousImage;
      }
    };
  })
  .filter("d10songTime", function() {
 
    var sanitize = function(input) {
      input = parseInt(input,10) * 1000;
      return input;
    };
    
    var minSecs = function(time) {
      var d = new Date(time);
      var m = d.getMinutes();
      if ( m < 10 ) {
        m = "0"+m;
      }
      var s = d.getSeconds();
      if ( s < 10 ) {
        s = "0"+s;
      }
      return m+":"+s;
    };
    
    var hourMins = function(time) {
      var d = new Date(time);
      var m = d.getMinutes();
      var h = d.getHours();
      if ( m < 10 ) {
        m = "0"+m;
      }
      return h+"h "+m+"min";
    };
    
    return function(input) {
      var time = sanitize(input);
      if ( time >= (60*60*1000) ) {
        return hourMins(time);
      } else {
        return minSecs(time);
      }
    };
  })
  .directive("d10songPlayerList",function() {
    return {
      restrict: 'A',
      templateUrl: '../html/rc/song/playerList.html',
      replace: false
    };
  })
  .directive("d10songList", function() {
    return {
      restrict: 'A',
      templateUrl: '../html/rc/song/list.html',
      replace: false
    };
  })
  .directive("d10songFragmentListInformations", function() {
    return {
      restrict: 'A',
      templateUrl: '../html/rc/song/songFragmentListInformations.html',
      replace: true
    };
  })
  .directive("d10songFragmentPageInformations", function() {
    return {
      restrict: 'A',
      templateUrl: '../html/rc/song/songFragmentPageInformations.html',
      replace: false
    };
  })
  .controller("d10inPlayerPageController", [
  "$scope",
  "$routeParams",
  "$location",
  "d10rc",
  "d10mixList",
  function($scope, $routeParams,$location,d10remoteControl, d10mixList) {
    $scope.home = function() {
      $location.path("/main");
    };
    
    $scope.mixVisibility = false;
    $scope.mixesList = [];
    d10mixList.then(function(response, err) {
      $scope.safelyApply(function() {
        $scope.mixesList = response;
      });
    });
    d10mixList = null;
    $scope.toggleMix = function() {
      $scope.mixVisibility = $scope.mixVisibility ? false : true;
//       if ( $scope.mixVisibility ) {
//         $scope.mixesList = d10mixList();
//       }
    };
    
    $scope.sendMix = function() {
      if ( !$scope.mix ) {
        return ;
      }
      $scope.remoteControl.mixSongAtIndex(
        $scope.mix.label, 
        $scope.mix.description,
        $scope.songIndex
      );
    };
    
    function getCurrentSong() {
      if ( $scope.remoteView.playlist[$routeParams.index] ) {
        $scope.song = $scope.remoteView.playlist[$routeParams.index];
        $scope.songIndex = $routeParams.index;
      }
    };
    $scope.$on("playlist:changed",function() {
      getCurrentSong();
    });
    getCurrentSong();
  }])
  .controller("d10songPageController", [
  "$scope",
  "$routeParams",
  "d10songFetch",
  "d10mixList",
  "d10rc",
  function($scope, $routeParams, d10songFetch, d10mixList, d10rc) {
    $scope.remoteControl = d10rc;
    $scope.toggle = {mix: false};
    $scope.mixesList = [];
    d10mixList.then(function(response, err) {
      $scope.safelyApply(function() {
        $scope.mixesList = response;
      });
    });
    d10mixList = null;
    d10songFetch($routeParams.id, function(err,resp) {
      $scope.safelyApply(function() {
        if ( err ) {
          debug("d10songPageController: error: ",err);
          return ;
        }
        debug("setting scope.song to ",resp);
        $scope.song = resp;
      });
    });
  }]);
  ;
  
  
})();