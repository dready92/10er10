var d10 = require ("./d10");

exports.playlistAndSongs = function(id, then) {
	
	var getSongs = function(playlist) {
		if ( !playlist.songs || !playlist.songs.length ) {
			return then(null,playlist);
		}
		
		d10.couch.d10.getAllDocs({include_docs: true, keys: playlist.songs},function(err,resp) {
			if ( err ) { return then(8); }
			playlist.songs = [];
			if ( resp.rows ) {
				resp.rows.forEach(function(v,k) {
					if ( !v.error ) {
						playlist.songs.push(v.doc);
					}
				});
			}
			then(null,playlist);
		});
	};
	
	if ( !id.length || id.substr(0,2) != "pl" ) {
		return then(8);
	}
	
	d10.couch.d10.getDoc(id,function(err,playlist) {
		if ( err ) { then(8); }
		else if ( playlist.songs && playlist.songs.length ) {
			getSongs(playlist);
		} else {
			then(null, playlist);
		}
	});
};

exports.update = function(playlist, songs, then) {
	if ( !playlist._id.length || playlist._id.substr(0,2) != "pl" ) {
		return then(8);
	}

	var songsDetail = [];

	var save = function() {
		playlist.songs = songs;
		d10.couch.d10.storeDoc(playlist,function(err,resp) {
			if ( err ) {  d10.log("debug",err);return then(4); }
			then(null,{playlist: playlist,songs: songsDetail});
			
		});
	};
	
	
	if ( songs.length ) {
		
		d10.couch.d10.getAllDocs({include_docs: true, keys: songs},function(err,docs) {
			if ( err ) { return then(8); }
			var good=true;
			docs.rows.forEach(function(v,k) {
				if ( v.error ) {
					good = false;
				} else {
					songsDetail.push(v.doc);
				}
			});
			if ( !good ) {
				return then(8);
			}
			save();
		});
	} else {
		save();
	}
};

exports.append = function(playlist, song, then) {
	if ( !playlist._id.length || playlist._id.substr(0,2) != "pl"
		|| !song.length || song.substr(0,2) != "aa" 
	) {
		return then(8);
	}
	
	var save = function(songDoc) {
		playlist.songs.push(song);
		
		d10.couch.d10.storeDoc(playlist,function(err,resp) {
			if ( err ) { 		return then(4); }
			playlist._rev = resp.rev;
			then(null,{playlist: playlist, song: songDoc});
		});
	};
	
	d10.couch.d10.getDoc(song,function(err,doc) {
		if ( err ) { then(8); }
		else { save(doc); }
	});
};

exports.create = function(login, name, songs, then) {
	d10.db.d10Infos(
		login,
		function(infos) {
			var good=true;
			infos.rows.forEach(function(v,k) {
				if ( v.doc._id.substr(0,2) == "pl" && v.doc.name == name ) {
					good = false;
				}
			});
			if ( !good ) {
				return then(430);
			}
			var playlist = { _id: "pl"+d10.uid(), name: name, user: login, songs: [] };
			d10.couch.d10.storeDoc(playlist,function(err,resp) {
				if ( err ) { 	return then(423); }
				if ( !songs || !songs.length ) {
					return then(null,{playlist: playlist, songs: []});
				}
				exports.update(playlist,songs,then);
			});
		},
		function(resp) {
			return d10.realrest.err(423,resp,request.ctx);
		}
	);
};

exports.rename = function(login,playlist, name, then) {
	d10.db.d10Infos(
		login,
		function(infos) {
			var good=true;
			infos.rows.forEach(function(v,k) {
				if ( v.doc._id.substr(0,2) == "pl" && v.doc.name == name ) {
					good = false;
				}
			});
			if ( !good ) {
				return then(430);
			}
			
			d10.couch.d10.getDoc(playlist,function(err,doc) {
				if ( err ) { 		return then(423);}
				if ( doc.user != login ) {
					return then(403);
				}
				doc.name = name;
				d10.couch.d10.storeDoc(doc,function(err,resp) {
					if ( err ) 		{then(423);}
					else	{ then(null,doc); }
				});
			});
		},
		function(resp) {
			return d10.realrest.err(423,resp,request.ctx);
		}
	);
};
