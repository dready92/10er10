(function() {
  
  angular.module("d10playpause",[])
  .directive("d10playpause",function() {
    var remot = require("js/d10.websocket.protocol.remot");
    return {
      restrict: 'A',
      templateUrl: '../html/rc/controls/playpause.html',
      replace: true,
      link: function ($scope) {
        $scope.d10playpause = $scope.d10playpause || {};
        $scope.d10playpause.play = function(evt) {
          debug("sending play command to peer");
          remot.play(function(err) {
            debug("play command response: ",err);
          });
          evt.stopPropagation();
          evt.preventDefault();
        };
        $scope.d10playpause.pause = function(evt) {
          debug("sending pause command to peer");
          remot.pause(function(err) {
            debug("pause command response: ",err);
          });
          evt.stopPropagation();
          evt.preventDefault();
        };
      }
    };
  })
  .directive("d10playnext",function() {
    var remot = require("js/d10.websocket.protocol.remot");
    return {
      restrict: 'A',
      templateUrl: '../html/rc/controls/playnext.html',
      replace: true,
      link: function ($scope) {
        $scope.d10playpause = $scope.d10playpause || {};
        $scope.d10playpause.playNext = function() {
          remot.next(function(err,done) {
            debug("next command response: ",err,"done:",done);
          });
        };
      }
    };
  })
  .directive("d10playprevious",function() {
    var remot = require("js/d10.websocket.protocol.remot");
    return {
      restrict: 'A',
      templateUrl: '../html/rc/controls/playprevious.html',
      replace: true,
      link: function ($scope) {
        $scope.d10playpause = $scope.d10playpause || {};
        $scope.d10playpause.playPrevious = function() {
          remot.previous(function(err,done) {
            debug("previous command response: ",err,"done:",done);
          });
        };
      }
    };
  })
  ;
  
  
})();