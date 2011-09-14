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
	
	d10.rest = {};
	var emitter = d10.rest.events = new d10.fn.eventEmitter();
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
		}
	};
	
	d10.rest.templates = function(options) {
		var endpoint = "templates";
		d10.bghttp.get ({
			url: site_url+"/api/htmlElements", 
			dataType:"json",
			restMode: true,
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
			}
		});
		emitter.trigger("whenRestBegin",{ endpoint: endpoint });
	};
	
	d10.rest.user = {
		infos: function(options) {
			var endpoint = "user.infos";
			d10.bghttp.get ( 
				{ 
					restMode: true,
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
					url: site_url+"/api/userinfos",
					dataType: "json" 
					
				} 
			);
			emitter.trigger("whenRestBegin",{ endpoint: endpoint });

		},
 		setPreference: function(name, value, options) {
			/*
			d10.bghttp.put({
				url: site_url+"/api/preference/hiddenExtendedInfos",
				contentType: "application/x-www-form-urlencoded",
				data: {value: value},
				success: $.proxy(this.refresh_infos,this)
			});*/
			var endpoint = "user.setPreference";
			d10.bghttp.put ( 
				{ 
					restMode: true,
					complete: function(err, data) {
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
					url: site_url+"/api/preference/"+name,
					dataType: "json",
					contentType: "application/x-www-form-urlencoded",
					data: {value: value}
				} 
			);
			emitter.trigger("whenRestBegin",{ endpoint: endpoint });
		},
		logout: function(options) {
			var endpoint = "user.logout";
			d10.bghttp.get ( 
				{ 
					restMode: true,
					complete: function(err, data) {
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
					url: site_url+"/welcome/goodbye"
				} 
			);
			emitter.trigger("whenRestBegin",{ endpoint: endpoint });
		},
		toReview: function(options) {
			var endpoint = "user.toReview";
			d10.bghttp.get ( 
				{ 
					restMode: true,
					complete: function(err, data) {
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
					url: site_url+"/api/toReview"
				} 
			);
			emitter.trigger("whenRestBegin",{ endpoint: endpoint });
		}
	};
	
	
})(jQuery);
