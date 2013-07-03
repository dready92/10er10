(function() {
  
  angular.module("d10search",[])
  .controller("d10searchController", [
  "$scope",
  "$location",
  function($scope, $location) {
    $scope.home = function() {
      $location.path("/main");
    };
  }]);
  
})();