(function() {
  
  angular.module("d10songsCache",[])
  .factory("d10songsCache",function() {
    var cache = {};
    return {
      set: function(key, value) {
        cache[key] = value;
      },
      get: function(id) {
        for (var key in cache) {
          for (var i in cache[key]) {
            if ( "_id" in cache[key][i] && cache[key][i]._id == id ) {
              return cache[key][i];
            }
          }
        }
      }
    };
  });
  
})();
