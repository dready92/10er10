var ncouch = require("../ncouch");
var config = require("../config");
var configChecker = require("./configChecker");

configChecker.check(function(err) {
// 	if ( err ) {
// 		console.log("got errrs");
// 	}else {
// 		console.log("all good");
// 	}
});

