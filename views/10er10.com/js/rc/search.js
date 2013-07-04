(function() {
  
  angular.module("d10search",[])
  .controller("d10searchController", [
  "$scope",
  "$location",
  "d10artistTokenizer",
  "d10search",
  function($scope, $location, d10artistTokenizer, d10search) {
    $scope.searchInProgress = false;
    $scope.query = "";
    $scope.results = {
      title: [],
      artist: [],
      album: []
    };
    $scope.resultsCount = 0;
    
    $scope.getResultsCount = function() {
      $scope.resultsCount = 0;
      if ( $scope.results && $scope.results.title ) {
        $scope.resultsCount += $scope.results.title.length;
      }
      if ( $scope.results && $scope.results.artist ) {
        $scope.resultsCount += $scope.results.artist.length;
      }
      if ( $scope.results && $scope.results.album ) {
        $scope.resultsCount += $scope.results.album.length;
      }
      return $scope.resultsCount;
    };
    
    $scope.home = function() {
      $location.path("/main");
    };
    
    $scope.search = function() {
      if ( !$scope.query || $scope.query.length < 3 ) {
        return false;
      }
      $scope.searchInProgress = true;
      d10search($scope.query, function(err,resp) {
        $scope.$apply(function() {
          $scope.searchInProgress = false;
          if ( !err ) {
            $scope.results.title = resp.title.map(function(i) {return i.doc});
            $scope.results.album = resp.album;
            $scope.results.artist = resp.artist;
            d10artistTokenizer($scope.results.title);
          }
          $scope.getResultsCount();
        });
      });
    };
    
  }])
  .factory("d10search", function() {
    var rest = require("js/d10.rest");
    return function(query, callback) {
      rest.search.all(query, {load: callback});
    };
  });
  
})();