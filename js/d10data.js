var joc = require ("./couch.rest").joc,
	config = require("./config");

exports.fillCtx = function (ctx,response,session) {
		ctx.session = session;
		response.rows.forEach(function(v,k) {
			if ( v.doc._id.indexOf("se") === 0 && v.doc._id != session._id ) {
				console.log("deleting session ",v.doc._id);
				joc(config.couch.auth.dsn,config.couch.auth.database).deleteDoc(
					{
						success: function(r) { console.log("session "+r.id+" deleted"); }
// 						error: function(data,response) {console.log("error deleting session : ");console.log(response);}
					}
					,v.doc);
			} else if ( v.doc._id.indexOf("us") === 0 ) {
				ctx.user = v.doc;
			} else if ( v.doc._id.indexOf("pr") === 0 ) {
				ctx.userPrivateConfig = v.doc;
			}
		});
};