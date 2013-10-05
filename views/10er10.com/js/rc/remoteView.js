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
                                           function(
                                             $scope, 
                                             $location,
                                             d10remoteControl) {
  
  $scope.remoteControl = d10remoteControl;
}]);


})();