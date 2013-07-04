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
    return function(input) {
      var time = parseInt(input, 10) * 1000;
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
  .controller("d10inPlayerListController", [
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
    
    $scope.toggleMix = function() {
      $scope.mixVisibility = $scope.mixVisibility ? false : true;
      if ( $scope.mixVisibility ) {
        $scope.mixesList = d10mixList();
      }
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
  ;
  
  
})();