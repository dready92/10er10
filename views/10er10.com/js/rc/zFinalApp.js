"use strict";
angular.module('d10remoteControl', ['d10remoteView']);
angular.module('d10remoteControl').directive('d10login',["$rootScope", function($rootScope) {
  var rest = require("js/d10.rest");
  return {
    restrict: 'A',
    scope: {},
    link: function($scope, $element, $attrs) {
      $scope.formDisabled = false;
      $scope.restLogin = function() {
        $element.find('input[data-ng-model]').each( function() {
          angular.element( this ).controller( 'ngModel' ).$setViewValue( $( this ).val() );
        });
        $scope.formDisabled = true;
        console.log($scope);
        if ( $scope.login && $scope.password ) {
          console.log("rest starting");
          rest.rc.login($scope.login, $scope.password, {
            load: function(err,resp) {
              $scope.$apply(function() {
                console.log("rest.rc.login load(): ",err,resp);
                if ( !err ) {
                  $rootScope.loginState= "logged";
                }
                $scope.formDisabled = false;
              });
            }
          });
        }
      };
    }
  };
}]);


angular.module('d10remoteControl').run(['$rootScope', function($rootScope) {
  var rest = require("js/d10.rest");
  $rootScope.loginState = "session";
  rest.rc.sessionLogin({
    load: function(err,resp) {
      $rootScope.$apply(function() {
        if ( err ) {
          $rootScope.loginState = "not logged";
        } else {
          $rootScope.loginState = "logged";
        }
      });
    }
  });
}]);

angular.module("d10remoteControl").directive("d10peerConnection", function() {
  var pubsub = require("js/d10.events");

  return {
    restrict: 'A',
    link: function($scope, $element, $attrs) {
      function connectionStatusChanged (status) {
        debug("Got connection status changed: ",status);
        if ( status === "peered" && $scope.peered === false) {
          $scope.$apply(function()  {
            debug("should switch UI to peered");
            $scope.peered = true;
          });
        } else if ( status != "peered" && $scope.peered === true ) {
          $scope.$apply(function()  {
            debug("should switch UI to not peered");
            $scope.peered = false;
          });
        }
      };
      $scope.peered = false;
      $scope.$watch('loginState', function() {
        debug("loginState now is ",$scope.loginState);
        if ( $scope.loginState == 'logged' ) {
          pubsub.topic("remot-connection").subscribe(connectionStatusChanged);
        } else {
          pubsub.topic("remot-connection").unsubscribe(connectionStatusChanged);
        }
      });
    }
  };
});

require(["js/d10.events", "js/d10.rest", "js/config", "js/d10.remot.master.connection",
  "js/d10.remot.master.endpoints", "js/d10.artistTokenizer"
], function() {
  var rest = require("js/d10.rest");
  var config = require("js/config");
  var bghttp = require("js/d10.httpbroker");
  console.log(config);
  bghttp.init(config.base_url);
  
  angular.bootstrap( angular.element("body"), ["hmTouchevents","d10remoteControl","d10song","d10playpause"]);
});
