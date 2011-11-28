define(["js/d10.events"],function(pubsub) {
	return function eventsBinder() {
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
				pubsub.topic(index).subscribe(this._events[index]);
			}
			this.enabled = true;
		};
		
		this.unbind = function () {
			for ( var index in this._events ) {
				pubsub.topic(index).unsubscribe(this._events[index]);
			}
			this.enabled = false;
		};
	};
});