(function($){
	window.d10.when = function (elems, then) {
		var responses = {}, errors = {},
			count = window.d10.count,
			elemsCount = count(elems),
			checkEOT = function() {
				var errCount = count(errors), respCount = count(responses);
				if ( respCount + errCount == elemsCount ) {
					if ( errCount ) { then.call(this,errors, responses); } 
					else { then.call(this,null,responses); }
				}
			},
			onResponse = null;
		
		for ( var k in elems) {
			(function(callback, key){
				callback.call(this,function(err,response) {
					if( err ) {	errors[key] = err; }
					else		{ responses[key] = response;}
					if( onResponse ) {
						onResponse(key,err,response);
					}
					checkEOT();
				});
			})(elems[k],k);
		}
		return {
			active: function() {  return (count(elems) - count(responses) - count(errors) ); },
			total: function() { return count(elems)},
			complete: function() { return (count(responses) + count(errors) ); },
			completeNames: function() {
				var back = [];
				for ( var index in responses ) { back.push(index); }
				for ( var index in errors ) { back.push(index); }
				return back;
			},
			onResponse: function(cb) {
				onResponse = cb;
			}
		};
	};
})(jQuery);