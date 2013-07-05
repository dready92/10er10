(function() {
  
  angular.module("d10mix",[])
  .factory("d10mixList", ["$q", function($q) {
    var remot = require("js/d10.websocket.protocol.remot");
    var deferred = $q.defer();
    var promise = deferred.promise;
    remot.mixesList(function(err,mixes) {
      if ( err ) {
        deferred.reject(err);
        return debug("d10mixList error: ",err);
      }
      deferred.resolve(mixes);
    });
    return promise;
  }]);
  
})();