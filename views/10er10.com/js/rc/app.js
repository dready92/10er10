"use strict";
angular.module('d10remoteControl', []);
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


require(["js/d10.events", "js/d10.rest", "js/config"], function() {
  var rest = require("js/d10.rest");
  var config = require("js/config");
  var bghttp = require("js/d10.httpbroker");
  console.log(config);
  bghttp.init(config.base_url);
  
  angular.bootstrap( angular.element("body"), ["d10remoteControl"]);
});
