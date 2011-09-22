(function($){

var dnd = function() {

  var dragging = null;

  var containers = [];

  this.setDragItem = function(item) { 
// 	  debug("dnd start got ",item.length," items ");
	  dragging = item; dragging.addClass("dragging").toggleClass("selected",true).css("opacity",0.5);}
  this.getDragItem = function() { return dragging ; }
  this.removeDragItem = function() {
	  if ( dragging == null ) {
// 		  debug("dragging is null");
		  return;
	  }
// 	  debug("dnd stop ",dragging.length," items ");
	  dragging.removeClass("dragging").removeClass("selected").css("opacity",1); dragging = null ; }

	this.onDragDefault = function(e) {
		var song = $(this);
		if ( $("span.review",this).length ) { return false; }
		song.toggleClass("selected",true);
		var dt = e.originalEvent.dataTransfer;
		dt.effectAllowed = "copy";
		dt.setData('text','playlist');
		dt.setDragImage( $('#songitem img')[0], 0, 0);
		d10.dnd.setDragItem( song.closest(".list").find(".song.selected") );
	};

  // options
  // copyDrop : song comes from another area than list
  // moveDrop : song comes from list
  // dragenter : other things to do on dragenter
  // dragleave : other things to do on dragleave
  this.dropTarget = function(container, list, options  ) {
    var settings = {
		"copyDrop": function(){},
		"moveDrop": function(){},
		"dragenter": function(){},
		"dragleave": function(){},
		"dropAllowed": function() {return true;},
		"containerHeight": function() { /*debug(container, container.height());*/return container.height(); }
	};
	$.extend(settings,options);

	var currentDnDposition = null;
	
	var onDnd = function (e) {
		if ( dragging == null ) { return ; }
		var song = $(e.target).closest('div.song');
		if ( !settings.dropAllowed({target: song, dragging: dragging}) ) {
			return true;
		}
		if ( dragging.includes(song) ) {
			$("div.song",list).removeClass("hover");
			return true;
		}
		
		if ( !song.length ) {
			$("div.song",list).removeClass("hover");
			var containerHeight = settings.containerHeight();
			if ( container.offset().top + (containerHeight  / 2) > e.pageY ) {
				$("div.song.hover",list).removeClass("hover");
				container.toggleClass("hovertop",true).toggleClass("hoverbottom",false);
// 				debug("before");
			} else {
				container.toggleClass("hoverbottom",true).toggleClass("hovertop",false);
// 				debug("after");
			}
			return false;
		} else {
			var othersongs = $("div.song", list).filter(function(index) {
				return this === song.get(0);
			});
			othersongs.toggleClass("hover",false);
			song.toggleClass("hover",true);
			container.toggleClass("hovertop hoverbottom",false);
			return false;
		}
	};


    container
      .bind("dragenter",onDnd)
      .bind("dragover",onDnd)
      .bind("dragleave",function(e) {
		debug("dragleave");
		
		if ( container.hasClass("hoverbottom") ) { currentDnDposition = "bottom"; } 
		else if ( container.hasClass("hovertop") ) { currentDnDposition = "top"; } 
		else { currentDnDposition = null; }
		  
        $("div.song.hover",list).removeClass("hover");
		
		
        container.removeClass("hovertop hoverbottom");
      })
      .bind("drop",function(e) {
		debug("drop called");
		e.originalEvent.preventDefault();
		var target = $(e.target).closest('div.song');
		if ( !target.length ) target = container;
		if ( ! dragging || !dragging.length ) {
			return false;
		}
        
        

		var infos = {"wantedNode": null};
		
		if ( currentDnDposition == "bottom" && $("div.song",list).length ) {
			infos.wantedNode = $("div.song",list).last();
		} else if ( currentDnDposition == null &&  target.hasClass("song") ) {
			infos.wantedNode = target;
		}
		
		// chrome is buggy with dnd, do we have to unset special css styles here... :-(
		$("div.song.hover",list).removeClass("hover");
		container.removeClass("hovertop hoverbottom");
			
			// check if song is part of the own list
        
        if ( list.children().includes( dragging.get(0) ) ) {
			debug("in move",dragging,target,infos);
			if ( infos.wantedNode && dragging.includes( infos.wantedNode.get(0) ) ) {
				debug("move skipped : target is in dragging");
				// we're in a move drop but the target is in the dragged items
				return false;
			}
			return settings.moveDrop.call(list,dragging,target, infos);
        } else {
			debug("in copy",dragging,target,infos);
			return settings.copyDrop.call(list,dragging,target, infos);
        }
// 				return true;
      });
  };

};



if ( !window.d10.mustache ) {
        window.d10.mustache = Mustache;
}

if ( !window.d10.mustacheView ) {
        window.d10.mustacheView = function (a,b,c) {
                return window.d10.mustache.to_html( window.d10.localcache.getTemplate(a), b, c );
        }
}


window.d10.dnd = new dnd();
window.d10.song_template = function (doc) {
  var d = new Date(1970,1,1,0,0,doc.duration);
  doc.human_length = d.getMinutes()+':'+d.getSeconds();
  
  var images = [];
  if ( doc.images ) {
	  doc.images.forEach(function(img) {
		  images.push(img.filename);
	  });
  }
  doc.images = images.join(",");
  if ( doc.user == d10.user.id() ) {
	  doc.owner = true;
  }
  return window.d10.mustacheView('song_template',doc);
}

window.d10.isValidEmailAddress = function (emailAddress) {
  return /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/.test(emailAddress);
};

window.d10.microtime = function() {
  return new Date().getTime() / 1000;
};

window.d10.time = function() {
  return parseInt(this.microtime(),10);
};


window.d10.libraryScope = {
	current: "full",
	toggle: function() {
		var event = this.current == "full" ? "user" : "full";
		this.current = event;
		d10.events.trigger("whenLibraryScopeChange", {scope: event});
	}
};


window.d10.routeEncode = function ( segments ) {
	var back = "/";
	if ( $.isArray(segments) ) {
		for ( var index in segments ) {
			back+=encodeURIComponent(segments[index])+"/";
		}
		return back.replace(/\/$/,"");
	} else if ( $.isPlainObject(segments) ) {
		for ( var index in segments ) {
			back+=encodeURIComponent(index)+"/"+encodeURIComponent(segments[index])+"/";
		}
		return back.replace(/\/$/,"");
	} else if ( typeof segments == "string" ) {
		return segments;
	}
	return back;
};

window.d10.routeDecode = function ( route ) {
	if ( typeof route != "string" ) {
		return route;
	}
	route = route.replace(/^\//,"");
	var segments = route.split("/");
	for ( var index in segments ) {
		segments[index] = decodeURIComponent(segments[index]);
	}
	return segments;
};

var jobWorker = function(url,onresponse) {
	var worker = new Worker(url);
	var callbacks = {};
	var running = this.running = false;
	this.sendJob = function(job,data,options) {
// 		debug("got sendJob...");
		running = true;
		var settings = { "success": function() {}, "error": function() {}, "complete": function() {} };
		callbacks = {};
		$.extend(callbacks,settings,options);
// 		debug("posting message",job,data);
		worker.postMessage( JSON.stringify({"job": job,"data": data}) );
	};
	worker.onmessage = function(e) {
// 		debug("jobworker message",e);
		var data = null;
		try {
			data = JSON.parse(e.data);
			if ( !data ) { return sendError("parsererror"); }
		} catch(e) { return sendError("parsererror"); }
		if ( data.error ) { return sendError(data.error,data.message); }
		sendSuccess(data);
	};
	
	worker.onerror = function(e) { sendError("worker",e.message); };
	
	var sendError = function (err,data) {
		onresponse("error",err,data);
// 		debug("job worker error",callbacks);
		callbacks.error ? callbacks.error(err,data): '';
		callbacks.complete ? callbacks.complete(err,data): '';
		callbacks = {};
		running = false;
	};
	
	var sendSuccess = function (data) {
		onresponse("success",data);
// 		debug("job worker success",callbacks);
		callbacks.success ? callbacks.success(data) : '';;
		callbacks.complete ? callbacks.complete(data) : '';;
		callbacks = {};
		running = false;
	};
  
};

var jobs = function(url, count) {
  var workers = [];
  var dedicatedData = [];
  var i = 0;
  for ( i=1;i<=count;i++) {
    workers.push(
    new jobWorker (url,function() {})
    );
    dedicatedData.push({"queue": []});
  }
  
  this.push = function (job, data, options) {
	  debug("push new job",job,data,options);
    if ( dedicated[job] ) {
      return sendDedicated(job,data,options);
    }
    for ( i=0; i<count;i++ ) {
      if ( workers[i].running == false ) {
        workers[i].sendJob(job,data,options);
        return true;
      }
    }
//     debug("JOBS: no worker available, job dropped ! ",job,data,options);
    return false;
  };
  
  var dedicated = {
    "player": count-1,
    "enablePing": count-1
  };
  var dedicatedInterval = null;
  
  var sendDedicated = function(job,data,options) {
    var index = dedicated[job];
    dedicatedData[index].queue.push({"job":job,"data":data,"options":options});
    dedicatedIteration();
  };

  var queueTimeout = null;
  var dedicatedIteration = function () {
	if ( queueTimeout ) return ;
	
	var iterate = function () {
		debug("dedicated worker iteration starts");
		var skipped = 0;
		for ( var index in dedicatedData ) {
			if ( !workers[index].running ) {
				if ( dedicatedData[index].queue.length ) {
					var a = dedicatedData[index].queue.pop();
					workers[index].sendJob(a.job,a.data,a.options);
				}
			}
		}
		for ( var index in dedicatedData ) {
			if ( dedicatedData[index].queue.length ) {
				queueTimeout = setTimeout(iterate,1000);
				return;
			}
		}
		queueTimeout = null;
	};
	queueTimeout = setTimeout(iterate,1000);
  };
};

window.d10.fn.jobs = jobs;

window.d10.dump = function () {
	var back = {};
	back.sessioncache = d10.sessioncache.dump();
	back.player = d10.player.dump();
	return back;
}
	
window.d10.count = function(obj) {
	var count = 0;
	for ( var k in obj ) {count++;}
	return count;
};

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




var inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: { value: ctor, enumerable: false }
  });
};



var eventsBinder = d10.fn.eventsBinder = function() {
	this.enabled = false; 
	this._events = {}; 
	
	this.addBindings = function (b) {
		var that = this;
		$.each(b,function(name,cb) {
			that.addBinding(name,cb);
		});
	};
	
	this.addBinding = function (name, cb) {
	// 	debug("add bindginsdé",name,cb);
		this._events[name] = cb;
	};
	
	this.bind = function () {
		for ( var index in this._events ) {
			debug("bind",index);
			$(document).bind(index,this._events[index]);
		}
		this.enabled = true;
	};
	
	this.unbind = function () {
		for ( var index in this._events ) {
			$(document).unbind(index,this._events[index]);
		}
		this.enabled = false;
	};
	
	
};


var playlistModule = d10.fn.playlistModule = function(name, bindings, hooks) {
	eventsBinder.call(this);
	this._playlistModule = {bindings: bindings ? bindings : {}, hooks: hooks ? hooks : {} };
	this.addBindings(bindings);
	this.name = name;
	
	this.enable = function() {
// 		debug("enable", this.enabled);
		if ( !this.enabled )	{
			if ( this._playlistModule.hooks.enable ) {
				this._playlistModule.hooks.enable.call(this);
			}
			this.bind();
		}
	};
	
	this.disable = function() {
		if ( this.enabled )	{
			this.unbind();
			if ( this._playlistModule.hooks.disable ) {
				this._playlistModule.hooks.disable.call(this);
			}
		}
	};
	
	this.isEnabled = function() {
		return this.enabled;
	};

};






d10.fn.router = {
	_containers: {
		main: {tab: $("#container > nav"), container: $("#main"), select: function(name) { return $("#"+name) }, lastActive: null, currentActive: null}
	},
	routes: {
	},
	switchContainer: function(from,to,tab,name) {
		if ( from ) from.hide().removeClass("active");
		if ( !to.hasClass("active") ) {
			to.fadeIn("fast").addClass("active");
			this.trigger("container:"+tab+"/"+name);
		}
	},
	_activate: function(tab, name, switchCallback) {
		switchCallback = switchCallback || this.switchContainer;
		if ( !this._containers[tab] ) {
			debug("router._activate: ",tab,"unknown");
			return this;
		}
		var currentActiveName = this.getActive(tab), currentActive = null, futureActive = this._containers[tab].select(name);
		
		if (  currentActiveName == name ) {
			return this;
		}
		if ( currentActiveName ) {
			currentActive = this._containers[tab].select(currentActiveName);
		}
		switchCallback.call(this,currentActive,futureActive,tab,name);
		this.switchTab(tab,name);
		this._containers[tab].lastActive = currentActiveName;
		this._containers[tab].currentActive = name;
		return this;
	},
	switchTab: function(tab,name) {
		var currentActive = this._containers[tab].tab.find(".active"), current = null;
		if ( currentActive.length ) {
			current = currentActive.attr("action");
			if ( current == name ) {
				debug("Tab name ",name,"is already active");
				return ;
			}
		}
		currentActive.removeClass("active");
		this._containers[tab].tab.find("[action="+name+"]").addClass("active");
		this.trigger("tab:"+tab+"/"+name);
	},
	navigateTo: function(segments) {
		segments = segments || [];
		if ( typeof segments == "string" ) {
			return this.navigate(segments,true);
		}
		segments = $.map(segments,function(v) { return encodeURIComponent(v); });
		var back = this.navigate(segments.join("/"),true);
		return back;
	},
	getActive: function(tab) {
		var active = this._containers[tab].tab.find(".active");
		if ( active.length ) {
			return active.eq(0).attr("action");
		}
		return null;
	},
};














})(jQuery);


(function($){

d10.fn.eventEmitter = function (simpleTrigger) {

	/*[
	* 	{selector: string, callback: fn }
	* ]
	*/
	var triggers = [];
	/* no need for event classes anymore
	var matchTrigger = function (name, trigger) {
		var classes = name.replace(/^\s+/,"").replace(/\s+$/,"").split(".");
		name = classes.shift();
		if ( !name )  return false;
		var selectors = trigger.selector.replace(/^\s+/,"").replace(/\s+$/,"").split(" ");
	//     var match = {"name": [], "classes": [] };
		for (var index in selectors) {
			var current = selectors[index].replace(/^\s+/,"").replace(/\s+$/,"").split(".");
			if ( !current.length || current[0] != name && current[0].length > 0 ) {
				continue;
			}
			if ( current.length == 1 ) {
				return true;
			}
			current.shift();
			var ok = true;
			for ( var i in current ) {
				if ( classes.indexOf(current[i]) < 0 ) {
					ok = false;
				}
			}
			if ( ok ) {
				return true;
			}
		}
		return false;
	};
	*/
	var matchTrigger = function(name, trigger) {
		if ( trigger.selector && trigger.selector == name ) {
			return true;
		}
		return false;
	};
	
	
  	return {
		trigger: function ( name, data ) {
			for ( var index in triggers ) {
				if ( matchTrigger(name, triggers[index]) ) {
					triggers[index].callback({"type": name},data);
				}
			}
		},
  		bind: function( selector, callback )  {
			triggers.push({ "selector": selector, "callback": callback  });
		},
		unbind: function ( selector, callback ) {
			var nt = [];
			for ( var index in triggers ) {
				if ( !matchTrigger(selector, triggers[index]) ) {
					nt.push(triggers[index]);
				} else if ( callback && triggers[index].callback !== callback ) {
					nt.push(triggers[index]);
				}
			}
			triggers = nt;
		},
		unbindAll: function() {
			triggers = [];
		}
		
	};
};

window.d10.events = new window.d10.fn.eventEmitter();

})(jQuery);


(function($){
	$.d10param = function(data) {
		return $.param(data).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A');
	};
})(jQuery);

(function($){
	var useFileReader = false;
	if ( typeof FileReader != "undefined" ) {
		var fr = new FileReader();
		if ( fr.addEventListener ) {
			useFileReader = true;
		}
		delete fr;
	}
	
	var restQuery = function(endpoint, method, url, options) {
			var query = {
				method: method,
				complete: function(err,data) {
					if ( options.load ) {
						options.load.apply(this,arguments);
					}
					emitter.trigger("whenRestEnd",{
						endpoint: endpoint,
						status: this.code,
						headers: this.headers,
						response: data
					});
				},
				restMode: true,
				url: url
			};
			if ( options.data ) {
				query.data = options.data;
			}
			if ( options.contentType ) {
				query.contentType = options.contentType;
			}
			d10.bghttp.request(query);
			emitter.trigger("whenRestBegin",{ endpoint: endpoint });
	};
	
	d10.rest = {};
	var emitter = d10.events;
	d10.rest.song = {
		upload: function (file, filename, filesize, options, callback) {
			var endpoint = "song.upload";
			if ( !callback ) {
				callback = options;
				options = null;
			}
			var xhr = new XMLHttpRequest();
			var url = site_url+"/api/song?"+$.d10param({"filesize": filesize, "filename": filename } );
			xhr.upload.onprogress = function(event) {
				if ( options.progress ) options.progress.call(this,event);
				emitter.trigger("whenRestUploadProgress",{endpoint: endpoint, event: event});
			}
			if ( options.end ) xhr.upload.onload = options.end;
			if ( options.readystatechange ) xhr.onreadystatechange = options.readystatechange;
			xhr.onerror = function(event) {
// 				debug("got error on upload",arguments);
				if ( options.error ) options.error.call(this,event);
				emitter.trigger("whenRestError",{endpoint: endpoint,event: event});
				xhr= null;
			};
			xhr.onabort = function (event) {
				if ( options.abort ) options.abort.call(this,event);
				emitter.trigger("whenRestAbort",{endpoint: endpoint,event: event});
				xhr= null;
			};
			xhr.onload = function() {
				if ( options.load ) options.load.call(this, this.status, this.getAllResponseHeaders(), this.responseText);
				callback(this.status, this.getAllResponseHeaders(), this.responseText);
				emitter.trigger("whenRestEnd",{
					endpoint: endpoint,
					status: this.status,
					headers: this.getAllResponseHeaders(),
					response: this.responseText
				});
				xhr=null;
			};
 
			if ( useFileReader ) {
				debug("using filereader");
				var reader = new FileReader();
				reader.onload = function() {
					xhr.open("PUT",url);
					xhr.sendAsBinary(reader.result);
					reader = null;
					file = null;
				};
				reader.readAsBinaryString(file);
			} else {
				debug("NOT using filereader");
				xhr.open("PUT",url);
				xhr.send(file);
				file = null;
			}
			emitter.trigger("whenRestBegin",{
				endpoint: endpoint,
				filename: filename,
				filesize: filesize,
				options: options
			});
		},
		remove: function(song_id, options) {
			restQuery("song.remove","DELETE",site_url+"/api/song/"+song_id,options);
		},
		get: function(song_id, options) {
			if ( $.isArray(song_id) ) {
				options.data = {ids: song_id};
				restQuery("song.get","POST",site_url+"/api/songs",options);
				
			} else {
				restQuery("song.get","GET",site_url+"/api/song/"+song_id,options);
			}
		},
 		/*
		 * @param start starting string of the song title
		 * 
		 * @return ["song title 1","song title 2", ...]
		 */
		listByTitle: function(start, options) {
			if ( !options && $.isPlainObject(start) ) {
				options = start;
				start = null;
			}
			if ( start ) {
				options.data = {start: start};
			}
			restQuery("song.listByTitle","GET",site_url+"/api/title",options);
		},
 
		uploadImage: function(song_id, file, filename, filesize, options) {
			var endpoint = "song.uploadImage";
			var xhr = new XMLHttpRequest();
			var url = site_url+"/api/songImage/"+song_id+"?"+$.d10param({filesize: file.size, filename: file.name});
			xhr.upload.onprogress = function(event) {
				if ( options.progress ) options.progress.call(this,event);
				emitter.trigger("whenRestUploadProgress",{endpoint: endpoint, event: event});
			}
			if ( options.end ) xhr.upload.onload = options.end;
			if ( options.readystatechange ) xhr.onreadystatechange = options.readystatechange;
			xhr.onerror = function(event) {
// 				debug("got error on upload",arguments);
				if ( options.error ) options.error.call(this,event);
				emitter.trigger("whenRestError",{endpoint: endpoint,event: event});
				xhr= null;
			};
			xhr.onabort = function (event) {
				if ( options.abort ) options.abort.call(this,event);
				emitter.trigger("whenRestAbort",{endpoint: endpoint,event: event});
				xhr= null;
			};
			xhr.onload = function() {
				var data = this.responseText, contentType = this.getResponseHeader("Content-Type") || "text/html";
				if ( contentType.match(/json$/) ) {
					try  { data = JSON.parse(data); }
					catch (e) { data = this.responseText; }
				}
				if ( options.load ) options.load.call(this, this.status == 200 ? null: this.status, this.getAllResponseHeaders(), data);
				emitter.trigger("whenRestEnd",{
					endpoint: endpoint,
					status: this.status,
					headers: this.getAllResponseHeaders(),
					response: data
				});
				xhr=null;
			};
 
			if ( useFileReader ) {
				debug("using filereader");
				var reader = new FileReader();
				reader.onload = function() {
					xhr.open("POST",url);
					xhr.sendAsBinary(reader.result);
					reader = null;
					file = null;
				};
				reader.readAsBinaryString(file);
			} else {
				debug("NOT using filereader");
				xhr.open("POST",url);
				xhr.send(file);
				file = null;
			}
			emitter.trigger("whenRestBegin",{
				endpoint: endpoint,
				filename: filename,
				filesize: filesize,
				options: options
			});
		},
		removeImage: function(song_id, filename, options) {
			restQuery("song.removeImage","DELETE","/api/songImage/"+song_id+"/"+filename,options);
		},
		random: function(options) {
			restQuery("song.random","POST","/api/random",options);
		},
		starring: {
			/*
			 * @param id String song id
			 * @param type String starring type ( "likes","dislikes")
			 */
			set: function(id, type, options) {
				restQuery("song.starring.set","PUT",site_url+"/api/starring/"+type+"/"+id, options);
			}
		},
		list: {
			hits: function(query, options) {
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				restQuery("song.list.hits","GET",site_url+"/api/list/hits",options);
			},
			creations: function(query, options) {
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				restQuery("song.list.creations","GET",site_url+"/api/list/creations",options);
			},
			genres: function(query, options) {
				options.data = {};
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				options.data.genre = query.genre;
				restQuery("song.list.genres","GET",site_url+"/api/list/genres",options);
			},
			albums: function(query, options) {
				options.data = {};
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				if( query.album ) {
					options.data.album = query.album;
				}
				restQuery("song.list.albums","GET",site_url+"/api/list/albums",options);
			},
 			artists: function(query, options) {
				options.data = {};
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				if( query.artist ) {
					options.data.artist = query.artist;
				}
				restQuery("song.list.artists","GET",site_url+"/api/list/artists",options);
			},
 			titles: function(query, options) {
				options.data = {};
				if ( query.startkey && query.startkey_docid ) {
					options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
				}
				if( query.title ) {
					options.data.title = query.title;
				}
				restQuery("song.list.titles","GET",site_url+"/api/list/titles",options);
			}
		}
	};
	
	d10.rest.templates = function(options) {
		restQuery("templates","GET",site_url+"/api/htmlElements",options);
	};
	

	d10.rest.user = {
		infos: function(options) {
			restQuery("user.infos","GET",site_url+"/api/userinfos",options);
		},
 		setPreference: function(name, value, options) {
			options.data = {value: value};
			restQuery("user.setPreference","PUT",site_url+"/api/preference/"+name,options);
		},
		logout: function(options) {
			restQuery("user.logout","GET",site_url+"/welcome/goodbye",options);
		},	
		review: {
			count: function(options) {
				restQuery("user.review.count","GET",site_url+"/api/toReview",options);
			},
			list: function(options) {
				restQuery("user.review.list","GET",site_url+"/api/review/list",options);
			},
			post: function(id, data,options) {
				options.data = data;
				restQuery("user.review.post", "PUT", site_url+"/api/meta/"+id,options);
			}
		},
		invites: {
			/*
			 * 
			 * @return void
			 */
			send: function(email, options) {
				options.data = {email: email};
				restQuery("user.invites.send","POST",site_url+"/api/sendInvite",options);
			},
			/*
			 *
			 * @return int nr of invites a user can give
			 */
			count: function(options) {
				restQuery("user.invites.cont","GET",site_url+"/api/invites/count",options);
			}
		},
		storeVolume: function(volume, options) {
			options.data = {volume: volume};
			restQuery("user.storeVolume","POST",site_url+"/api/volume",options);
		},
		playerList: {
			default: {
				store: function(list,options) {
					options.data = { list: list, type: "default"};
					restQuery("user.playerList.default.store","PUT",site_url+"/api/current_playlist",options);
				}
			},
			rpl: {
				store: function(id, options) {
					options.data = { rpl: id, type: "rpl"};
					restQuery("user.playerList.rpl.store","PUT",site_url+"/api/current_playlist",options);
				}
			}
		},
		likes: function(query, options) {
			if ( query.startkey && query.startkey_docid ) {
				options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
			}
			restQuery("user.likes","GET",site_url+"/api/list/likes",options);
		},
		songs: function(query, options) {
			if ( query.startkey && query.startkey_docid ) {
				options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
			}
			restQuery("user.songs","GET",site_url+"/api/list/s_user",options);
		},
		search: {
			all: function(query, options) {
				options.data = { start: query };
				restQuery("user.search.all","GET",site_url+"/api/own/search",options);
			}
		},
		artist: {
			list: function(start, options) {
				if ( !options && $.isPlainObject(start) ) {
					options = start;
					start = null;
				}
				if ( start ) {
					options.data = {start: start};
				}
				restQuery("user.artist.list","GET",site_url+"/api/own/artist",options);
			},
			allByName: function(options) {
				restQuery("user.artist.allByName","GET",site_url+"/api/own/artistsListing",options);
			}
		},
		album: {
			list: function(start, options) {
				if ( !options && $.isPlainObject(start) ) {
					options = start;
					start = null;
				}
				if ( start ) {
					options.data = {start: start};
				}
				restQuery("user.album.list","GET",site_url+"/api/own/album",options);
			}
		},
		genre: {
			resume: function(options) {
				restQuery("user.genre.resume","GET",site_url+"/api/own/genresResume",options);
			}
		},
		song: {
			random: function(options) {
				restQuery("user.song.random","POST","/api/own/random",options);
			},
			listByTitle: function(start, options) {
				if ( !options && $.isPlainObject(start) ) {
					options = start;
					start = null;
				}
				if ( start ) {
					options.data = {start: start};
				}
				restQuery("user.song.listByTitle","GET",site_url+"/api/own/title",options);
			},
			list: {
				creations: function(query, options) {
					if ( query.startkey && query.startkey_docid ) {
						options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
					}
					restQuery("user.song.list.creations","GET",site_url+"/api/own/list/creations",options);
				},
				genres: function(query, options) {
					options.data = {};
					if ( query.startkey && query.startkey_docid ) {
						options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
					}
					options.data.genre = query.genre;
					restQuery("user.song.list.genres","GET",site_url+"/api/own/list/genres",options);
				},
				albums: function(query, options) {
					options.data = {};
					if ( query.startkey && query.startkey_docid ) {
						options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
					}
					if( query.album ) {
						options.data.album = query.album;
					}
					restQuery("user.song.list.albums","GET",site_url+"/api/own/list/albums",options);
				},
				artists: function(query, options) {
					options.data = {};
					if ( query.startkey && query.startkey_docid ) {
						options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
					}
					if( query.artist ) {
						options.data.artist = query.artist;
					}
					restQuery("user.song.list.artists","GET",site_url+"/api/own/list/artists",options);
				},
				titles: function(query, options) {
					options.data = {};
					if ( query.startkey && query.startkey_docid ) {
						options.data = {startkey: query.startkey, startkey_docid: query.startkey_docid};
					}
					if( query.title ) {
						options.data.title = query.title;
					}
					restQuery("user.song.list.titles","GET",site_url+"/api/own/list/titles",options);
				}
			}
		}
 		
	};
	
	d10.rest.server = {
		length: function(options) {
			restQuery("server.length","GET",site_url+"/api/length",options);
		},
		load: function(options) {
			restQuery("server.load","GET",site_url+"/api/serverLoad",options);
		}
	};

	
	d10.rest.album = {
		/*
		 * @param start starting string of the album name
		 * 
		 * @return ["album 1","album2", ...]
		 */
		list: function(start, options) {
			if ( !options && $.isPlainObject(start) ) {
				options = start;
				start = null;
			}
			if ( start ) {
				options.data = {start: start};
			}
			restQuery("album.list","GET",site_url+"/api/album",options);
		},
		/*
		 * @param album String album name
		 * 
		 * @return [ {key: [album, "artist 1"], value: 4}, ...]
		 */
		artists: function(album, options) {
			restQuery("album.artists","GET",site_url+"/api/list/albums/artists/"+ encodeURIComponent(album),options);
		}

	};
	
	d10.rest.artist = {
		/*
		 * @param start starting string of the artist name
		 * 
		 * @return ["artist 1","artist 2", ...]
		 */
		list: function(start, options) {
			if ( !options && $.isPlainObject(start) ) {
				options = start;
				start = null;
			}
			if ( start ) {
				options.data = {start: start};
			}
			restQuery("artist.list","GET",site_url+"/api/artist",options);
		},
 
 		/*
		 * 
		 * @return [ {key: ["ACDC"], value: 4} ]
		 */
		allByName: function(options) {
			restQuery("artist.allByName","GET",site_url+"/api/artistsListing",options);
		},
  
		/*
		 * @param artist String artist name
		 * 
		 * @return { artists: { "artist name": 45, "other name": 5, ... }, artistsRelated: { "other artist name": 5, ...}}
		 */
		related: function(artist, options) {
			restQuery("artist.related","GET",site_url+"/api/relatedArtists/"+ encodeURIComponent(artist),options);
		},
 
		/*
		 * @param artist String artist name
		 * 
		 * @return [ {key: [artist, "album 1"], value: 4}, ...] 
		 */
		albums: function(artist, options) {
			restQuery("artist.albums","GET",site_url+"/api/list/artists/albums/"+ encodeURIComponent(artist),options);
		},
 
		/*
		 * @param artist String artist name
		 * 
		 * @return [ {key: [artist, "genre 1"], value: 4}, ...]
		 */
		genres: function(artist, options) {
			restQuery("artist.genres","GET",site_url+"/api/list/artists/genres/"+ encodeURIComponent(artist),options);
		}
	};
	
	d10.rest.genre = {
		/*
		 * @param start starting string of the genre name
		 * 
		 * @return ["genre 1","genre 2", ...]
		 */
		list: function(start, options) {
			if ( !options && $.isPlainObject(start) ) {
				options = start;
				start = null;
			}
			if ( start ) {
				options.data = {start: start};
			}
			restQuery("genre.list","GET",site_url+"/api/genre",options);
		},
		/*
		 * 
		 * 
		 * @return [ {"key":["Dub"],"value":{"count":50,"artists":["Velvet Shadows","Tommy McCook & The Aggrovators","Thomsons All Stars"]}}, ... ]
		 */
		resume: function(options) {
			restQuery("genre.resume","GET",site_url+"/api/genresResume",options);
		},
		/*
		 * @param genre String genre the album should belong to
		 * 
		 * @return [ {key: [genre, "album1"], value: 4}, ...], 
		 */
		albums: function(genre, options) {
			restQuery("genre.albums","GET",site_url+"/api/list/genres/albums/"+encodeURIComponent(genre),options);
		},
 		/*
		 * @param genre String genre the artist should belong to
		 * 
		 * @return [ {key: [genre, "artist 1"], value: 4}, ...], 
		 */
		artists: function(genre, options) {
			restQuery("genre.artists","GET",site_url+"/api/list/genres/artists/"+encodeURIComponent(genre),options);
		}
	};	
	
	d10.rest.rpl = {
		/*
		 * 
		 * @return {_id: "pl....", ...}
		 */
		get: function(id,options) {
			restQuery("rpl.get","GET",site_url+"/api/plm/"+id,options);
		},

		create: function(name, songs, options) {
			options.data = {
				name: name,
				"songs[]": songs ? songs : []
			};
			restQuery("rpl.create","PUT",site_url+"/api/plm/create",options);

		},
		/*
		 * 
		 * @return {playlist: {_id: "pl...",...}, songs: [{_id: "aa...", ...}, ... ]}
		 */
		update: function(id, songs, options) {
			options.data = {
				playlist: id,
				"songs[]": songs
			};
			restQuery("rpl.update","PUT",site_url+"/api/plm/update",options);
		},
		/*
		 * 
		 * @return {_id: "pl....", ...}
		 */		
		remove: function(id, options) {
			restQuery("rpl.delete","DELETE",site_url+"/api/plm/"+id,options);
		},
		/*
		 * 
		 * @return {_id: "pl....", ...}
		 */
		rename: function(id,name,options) {
			options.data = {
				name:name
			};
// 			options.contentType = "application/x-www-form-urlencoded";
			restQuery("rpl.rename","PUT",site_url+"/api/plm/rename/"+id,options);
		},
		/*
		 * 
		 * @return {playlist: {_id: "pl...",...}, song: {_id: "aa...", ...}}
		 */		
		append: function(id,song_id,options) {
			options.data = {
				song:song_id
			};
// 			options.contentType = "application/x-www-form-urlencoded";
			restQuery("rpl.append","PUT",site_url+"/api/plm/append/"+id,options);
		}
	};
	
	d10.rest.search = {
		all: function(query, options) {
			options.data = { start: query };
			restQuery("search.all","GET",site_url+"/api/search",options);
		},
		details: function(details, options) {
			options.data = details;
			restQuery("search.details","POST",site_url+"/api/details",options);
		}
	};
	
})(jQuery);
