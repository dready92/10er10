(function() {
  
  angular.module("d10song",[])
  .factory("d10artistTokenizer", function() {
    var at = require("js/d10.artistTokenizer");
    return function tokenizer(doc) {
      if ( angular.isArray(doc) ) {
        doc.forEach(function(d) {
          tokenizer(d);
        });
        return ;
      }
      var tokens = at(doc,true);
      doc.token = {
      title: tokens[1],
      artist: tokens[0].shift(),
      artists: tokens[0]
      };
      return doc;

    }
  })
  ;
  
  
})();