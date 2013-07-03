(function() {
  
  angular.module("d10nav",[])
  .directive("d10insideNav",function() {
    return {
      restrict: "A",
      replace: false,
      templateUrl: '../html/rc/nav/inside.html'
    };
  })
  .directive("d10tab", function() {
    return {
      restrict: 'A',
      replace: false,
      link: function($scope,$element,$attrs) {
        $scope.currentPane = null;
        $scope.setCurrentPane = function(name) {
          $scope.currentPane = name;
        };
        $scope.getCurrentPane = function() {
          return $scope.currentPane;
        };
      }
    };
  })
  ;
  
})();