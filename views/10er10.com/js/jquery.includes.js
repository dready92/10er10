(function($){



 
$.fn.includes = function(node) {
  if ( (typeof node === 'object' && node.jquery) ) {
    node = node.get(0);
  }
  return this.filter( function(index) { return this === node; } ).length > 0 ;
};
 


})(jQuery);