(function() {
  
  angular.module("d10playpause",[])
  .directive("d10playpause",function() {
    var remot = require("js/d10.websocket.protocol.remot");
    return {
      restrict: 'A',
      templateUrl: '../html/rc/controls/playpause.html',
      replace: true,
      link: function ($scope) {
        $scope.d10playpause = {
          play: function(evt) {
            debug("sending play command to peer");
            remot.play(function(err) {
              debug("play command response: ",err);
            });
            evt.stopPropagation();
            evt.preventDefault();
          },
          pause: function(evt) {
            debug("sending pause command to peer");
            remot.pause(function(err) {
              debug("pause command response: ",err);
            });
            evt.stopPropagation();
            evt.preventDefault();
          }
        };
      }
    };
  })
  ;
  
  
})();