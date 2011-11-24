 
(function($){
	$.d10param = function(data) {
		return $.param(data).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A');
	};
})(jQuery);