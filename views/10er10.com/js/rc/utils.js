"use strict";
(function() {

angular.module("d10utils",[]).filter("d10encode",function() {
  return function(input) {
    return encodeURIComponent(input);
  }
});
  
})();