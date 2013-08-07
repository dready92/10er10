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
          angular .element( this ).controller( 'ngModel' )
                  .$setViewValue( $( this ).val() );
        });
        $scope.formDisabled = true;
        if ( !$scope.login || !$scope.password ) {
          return;
        }
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
      };
    }
  };
}]);


angular.module('d10remoteControl').config(['$routeProvider',function($routeProvider) {
  $routeProvider.when('/main', {
    templateUrl: '../html/rc/remoteDisplay/container.html',
    controller: "d10remoteViewController",
    cache: true
  });
  
  $routeProvider.when('/playerList/:index', {
    templateUrl: '../html/rc/song/inPlayerPage.html',
    controller: "d10inPlayerPageController"
  });
  
  $routeProvider.when('/search', {
    templateUrl: '../html/rc/search/container.html',
    controller: "d10searchController",
    cache: true
  });
  
  $routeProvider.when('/song/:id', {
    templateUrl: '../html/rc/song/page.html',
    controller: "d10songPageController"
  });
  
  $routeProvider.when('/album/:name', {
    templateUrl: '../html/rc/album/page.html',
    controller: "d10albumPageController"
  });

  $routeProvider.when('/artist/:name', {
    templateUrl: '../html/rc/artist/page.html',
    controller: "d10artistPageController"
  });
  
  $routeProvider.otherwise({redirectTo: "/main"});
  
}]);

angular.module('d10remoteControl').run(
  [
    '$rootScope', 
    'd10rcView', 
    'd10session', 
    '$window', 
    '$location', 
    'd10session',
    function($rootScope, d10rcView, d10session, $window, $location) {
  var rest = require("js/d10.rest");
  var pubsub = require("js/d10.events");
  $rootScope.remoteView = d10rcView;
  $rootScope.loginState = "session";
  $rootScope.router = {
    back: function() {
      $window.history.back();
    },
    songPage: function(id) {
      $location.path('/song/'+id);
    },
    home: function() {
      $location.path('/main');
    }
  };
  d10session.sessionLogin(function(err, logged) {
    $rootScope.$apply(function() {
      if ( err || !logged  ) {
        $rootScope.loginState = "not logged";
      } else {
        $rootScope.loginState = "logged";
      }
    });
  });
  
  $rootScope.safelyApply = function(callback) {
    var self = this;
    if ( self.$$phase ) {
      callback();
    } else {
      self.$apply(callback);
    }
  };
  
  $rootScope.logout = function() {
    d10session.logout(function(err) {
      if ( !err ) {
        $rootScope.safelyApply(function() {
          $rootScope.loginState = "not logged";
        });
      }
    });
  };
}]);

angular.module("d10remoteControl").directive("d10peerConnection", function() {
  var pubsub = require("js/d10.events");
  var remotConnection = require("js/d10.remot.master.connection");
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
      $scope.peered = remotConnection.status() === "peered" ? true : false;
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

angular.module("d10remoteControl").filter("d10encode",function() {
  return function(input) {
    return encodeURIComponent(input);
  }
});

require(["js/d10.events", "js/d10.rest", "js/config", "js/d10.remot.master.connection",
  "js/d10.remot.master.endpoints", "js/d10.artistTokenizer", "js/d10.imageUtils"
], function() {
  var rest = require("js/d10.rest");
  var config = require("js/config");
  var bghttp = require("js/d10.httpbroker");
  var websocket = require("js/d10.websocket");
  console.log(config);
  websocket.init(location.host+config.base_url);
  bghttp.init(config.base_url);
  
  angular.bootstrap(angular.element("body"), [
    "hmTouchevents",
    "d10remoteControl",
    "d10miniplayer",
    "d10rc",
    "d10nav",
    "d10song",
    "d10session",
    "d10album",
    "d10artist",
    "d10songsCache",
    "d10playpause", 
    "d10cachedRouteView",
    "d10mix",
    "d10search",
    "d10notification"
  ]);
});
