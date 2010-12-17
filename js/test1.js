var stat = require("./serverstat"); 

exports.test1 = function (req,res,next) { 
	console.log("here 1 !");
	stat.total(true);
	
	req.ctx = {
		request: req,
		response: res,
		headers: [],
		status: 404
	};
	
	
	next(); 
};