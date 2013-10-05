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
                                           function(
                                             $scope, 
                                             $location,
                                             d10remoteControl,
                                             d10rcView
                                                   ) {
  $scope.remoteView = d10rcView;
  $scope.remoteControl = d10remoteControl;
}]);


})();