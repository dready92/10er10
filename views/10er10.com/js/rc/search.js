(function() {
  
  angular.module("d10search",[])
  .controller("d10searchController", [
  "$scope",
  "$location",
  "d10artistTokenizer",
  "d10search",
  "d10songsCache",
  "d10searchPageCache",
  function($scope, $location, d10artistTokenizer, d10search, d10songsCache,
    d10searchPageCache
  ) {
    $scope.titleList = {toggleControls: false};

    $scope.search = d10searchPageCache;
    $scope.getResultsCount = function() {
      $scope.search.resultsCount = 0;
      if ( $scope.search.results && $scope.search.results.title ) {
        $scope.search.resultsCount += $scope.search.results.title.length;
      }
      if ( $scope.search.results && $scope.search.results.artist ) {
        $scope.search.resultsCount += $scope.search.results.artist.length;
      }
      if ( $scope.search.results && $scope.search.results.album ) {
        $scope.search.resultsCount += $scope.search.results.album.length;
      }
      return $scope.search.resultsCount;
    };
    
    $scope.startSearch = function() {
      if ( !$scope.search.query || $scope.search.query.length < 3 ) {
        return false;
      }
      $scope.search.searchInProgress = true;
      d10search($scope.search.query, function(err,resp) {
        $scope.$apply(function() {
          $scope.search.searchInProgress = false;
          if ( !err ) {
            $scope.search.results.title = resp.title.map(function(i) {return i.doc});
            $scope.search.results.album = resp.album;
            $scope.search.results.artist = resp.artist;
            d10artistTokenizer($scope.search.results.title);
            d10songsCache.set("d10searchController",$scope.search.results.title);
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
  })
  .factory("d10searchPageCache", function() {
    return {
      searchInProgress: false,
      query: "",
      results: {
        title: [],
        artist: [],
        album: []
      },
      resultsCount: 0,
      openedTab: false
    };
  });
  
})();