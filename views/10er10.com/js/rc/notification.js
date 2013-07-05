(function() {
  
  angular.module("d10notification",[]).
  factory("d10notification",["$rootScope","$document","$compile",function($rootScope, $document, $compile) {
    var widget = angular.element("<div data-d10notification></div>");
    var $scope = $rootScope.$new(true);
    var dequeueTimeoutId = null;
    var infoMessageTTL = 3000;
    var service = {
      TYPE_INFO: "info",
      TYPE_ERROR: "error"
    };
    $scope.safelyApply = $rootScope.safelyApply;
    $scope.message = false;
    $document.find("body").append(widget);
    $compile(widget)($scope);
    
    
    var messageQueue = [];
    
    function queueMessage(message, type, icon) {
      if ( !type ) {
        type = service.TYPE_INFO;
      }
      if ( type != service.TYPE_INFO &&
           type != service.TYPE_ERROR ) {
        type = service.TYPE_INFO;
      }
      messageQueue.push({message: message, type: type, icon: icon});
      startDequeue();
    };
    
    function startDequeue() {
      if ( dequeueTimeoutId ) {
        return ;
      }
      dequeue();
    };
    
    function showMessage(message, type, icon) {
      $scope.safelyApply(function() {
        $scope.message = message;
        $scope.type = type;
        $scope.icon = icon;
      });
    };
    
    function hideWidget() {
      $scope.safelyApply(function() {
        $scope.message = false;
      });
    }
    
    function dequeue () {
      if ( messageQueue.length ) {
        var messageContainer = messageQueue.shift();
        showMessage(messageContainer.message, 
                    messageContainer.type,
                    messageContainer.icon);
        dequeueTimeoutId = setTimeout(dequeue, infoMessageTTL);
      } else {
        dequeueTimeoutId = null;
        hideWidget();
      }
    };
    service.notify = queueMessage;
    return service;
  }])
  
  .directive("d10notification", function() {
    return {
      restrict: "A",
      replace: true,
      templateUrl: '../html/rc/notification/container.html'
    };
  });
  
})();