(function() {

angular.module("d10miniplayer",[])
.directive("d10miniplayer", function() {
  return {
    restrict: "A",
    templateUrl: "../html/rc/miniplayer/container.html",
    replace: true
  };
})
;  
})();