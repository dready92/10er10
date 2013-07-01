(function() {
  
  angular.module("d10mix",[])
  .factory("d10mixList", function() {
    var remot = require("js/d10.websocket.protocol.remot");
    var mixesList = [];
    
    remot.mixesList(function(err,mixes) {
      if ( err ) {
        return debug("d10mixList error: ",err);
      }
      mixesList = mixes;
    });
    
    return function getMixesList() {
      return mixesList.slice(0);
    };
    
  });
  
})();