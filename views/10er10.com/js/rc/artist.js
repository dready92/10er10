(function() {
angular.module("d10artist",[])
.directive("d10artistListItem", function() {
  return {
    restrict: "A",
    templateUrl: "../html/rc/artist/listItem.html",
    replace: true
  };
})
;

})();