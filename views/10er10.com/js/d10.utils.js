define(function() {
	var icuCollation = [
		" ", "`" , "^", "_", "-", ",", ";", ":", "!", "?", "." ,"'", "\"", "(", ")", "[", "]", "{", "}",
	   "@", "*", "/", "\\", "&", "#", "%", "+", "<", "=", ">", "|", "~", "$", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
	   "a", "A", "b", "B", "c", "C", "d", "D", "e", "E", "f", "F", "g", "G", "h", "H", "i", "I", "j", "J", "k", "K", "l", "L",
	   "m", "M", "n", "N", "o", "O", "p", "P", "q", "Q", "r", "R", "s", "S", "t", "T", "u", "U", "v", "V", "w", "W", "x", "X",
	   "y", "Y", "z", "Z", "ZZZZZZZZ"
	],
	nextLetterJS = function(l) {
		debug("using JS collation");
		return String.fromCharCode( (l.charCodeAt(0)+1) );
	};
	return {
		isValidEmailAddress: function (emailAddress) {
			return /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/.test(emailAddress);
		},
		microtime: function() {
			return new Date().getTime() / 1000;
		},
		time: function() {
			return parseInt(this.microtime(),10);
		},
		keyOfHighestValue: function(h) {
			var count= 0, value=null;
			for ( var i in h ) {
				if ( h[i] > count ) {
					count= h[i];
					value=i;
				}
			}
			return value;
		},
		nextLetter: function(l) {
			var index = icuCollation.indexOf(l), 
				next = ( index > -1 && index+1 < icuCollation.length ) ? icuCollation[ (index+1) ] : nextLetterJS(l);
			return next;
		},
		nextLetterJS: nextLetterJS,
		count: function(obj) {
			var count = 0;
			for ( var k in obj ) {count++;}
			return count;
		}
	};
});