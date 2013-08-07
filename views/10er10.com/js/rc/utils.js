"use strict";
(function() {

angular.module("d10utils",[]).filter("d10encode",function() {
  return function(input) {
    var back = encodeURIComponent(
      encodeURIComponent(input)
    );
    return back;
      
  }
});
  
})();