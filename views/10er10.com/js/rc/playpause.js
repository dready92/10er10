(function() {
  
  angular.module("d10playpause",[])
  .directive("d10playpause",function() {
    var remot = require("js/d10.websocket.protocol.remot");
    return {
      restrict: 'A',
      templateUrl: '../html/rc/controls/playpause.html',
      replace: true
    };
  })
  .directive("d10playnext",function() {
    var remot = require("js/d10.websocket.protocol.remot");
    return {
      restrict: 'A',
      templateUrl: '../html/rc/controls/playnext.html',
      replace: true
    };
  })
  .directive("d10playprevious",function() {
    var remot = require("js/d10.websocket.protocol.remot");
    return {
      restrict: 'A',
      templateUrl: '../html/rc/controls/playprevious.html',
      replace: true
    };
  })
  ;
  
  
})();