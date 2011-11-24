 
(function($){
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
})(jQuery);