"use strict";

(function() {

angular.module("d10remoteView",[]);
angular.module("d10remoteView").directive("d10remoteViewContainer", function() {
  return {
    restrict: 'A',
    templateUrl: '../html/rc/remoteDisplay/container.html',
    replace: true
  };
});


angular.module("d10remoteView").controller("d10remoteViewController", 
                                           [
                                           "$scope",
                                           "$location",
                                           "d10rc",
                                           'd10rcView',
                                           '$window',
                                           '$timeout',
                                           'd10remoteViewPageCache',
                                           function(
                                             $scope, 
                                             $location,
                                             d10remoteControl,
                                             d10rcView,
                                             $window,
                                             $timeout,
                                             d10remoteViewPageCache
                                                   ) {
  d10remoteViewPageCache.scrollY = d10remoteViewPageCache.scrollY || 0;
  var scrollY = d10remoteViewPageCache.scrollY;
  function onWindowScroll() {
    scrollY = $window.scrollY;
  };
  $scope.remoteView = d10rcView;
  $scope.remoteControl = d10remoteControl;
  angular.element($window).bind("scroll",onWindowScroll);
  $scope.$on("$destroy",function() {
    angular.element($window).unbind("scroll",onWindowScroll);
    d10remoteViewPageCache.scrollY = scrollY;
  });
  
  $timeout(function() {
    $window.scrollTo(0,scrollY);
  },0);
}])
.factory("d10remoteViewPageCache",function() {
  return {};
});


})();