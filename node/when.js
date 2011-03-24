

exports = module.exports = function (elems, then) {
	var 
		responses = {},
		
		errors = {},
		
		count = function(obj) {
			var count = 0;
			for ( var k in obj ) {
				count++;
			}
			return count;
		},
		
		elemsCount = count(elems),
		
		checkEOT = function() {
			var errCount = count(errors), respCount = count(responses);
			if ( respCount + errCount == elemsCount ) {
				if ( errCount ) {
					then.call(this,errors, responses);
				} else {
					then.call(this,null,responses);
				}
			}
		};
	
	for ( var k in elems) {
		(function(callback, key){
			callback.call(this,function(err,response) {
				if( err ) {	errors[key] = err; }
				else		{ responses[key] = response;}
				checkEOT();
			});
		})(elems[k],k);
	}
	return {
		active: function() {  return (elems.length - responses.length - errors.length ); },
		total: function() { return elems.length},
		complete: function() { return (responses.length + errors.length); },
		completeNames: function() {
			var back = [];
			for ( var index in responses ) { back.push(index); }
			for ( var index in errors ) { back.push(index); }
			return back;
		}
	};
};