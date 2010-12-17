var stat = require("./serverstat"); 

exports.test1 = function (req,res,next) { 
	console.log("here 1 !");
	stat.total(true);
	next(); 
};