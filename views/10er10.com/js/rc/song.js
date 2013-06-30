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
  .filter("d10songImage", function() {
    var imageUtils = require("js/d10.imageUtils");
    var anonymousImage = imageUtils.getAlbumDefaultImage();
    return function d10songImage(input) {
      if ( input && input.images && input.images.length ) {
        return imageUtils.getImageUrl(input.images[0].filename);
      } else {
        return anonymousImage;
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
  
  .controller("d10inPlayerListController", [
  "$scope",
  "$routeParams",
  "$location",
  "d10rc",
  function($scope, $routeParams,$location,d10remoteControl) {
    $scope.home = function() {
      $location.path("/main");
    };
    function getCurrentSong() {
      if ( $scope.remoteView.playlist[$routeParams.index] ) {
        $scope.song = $scope.remoteView.playlist[$routeParams.index];
      }
    };
    $scope.$on("playlist:changed",function() {
      getCurrentSong();
    });
    getCurrentSong();
  }])
  ;
  
  
})();