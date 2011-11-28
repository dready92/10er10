define( function(emitter) {
// 	var events = new emitter();
// 	return events;

	var topics = {};
	var Topic = function( id ) {
		var callbacks,
			method,
			topic = id && topics[ id ];
		if ( !topic ) {
			callbacks = jQuery.Callbacks();
			topic = {
				publish: callbacks.fire,
				subscribe: callbacks.add,
				unsubscribe: callbacks.remove,
				one: function(callback) {
					var proxyCallback = function() { callback.apply(this,arguments); topic.unsubscribe(proxyCallback); };
					topic.subscribe(proxyCallback);
				}
			};
			if ( id ) {
				topics[ id ] = topic;
			}
		}
		return topic;
	};

	var defaultTopic = Topic("deprecated");
	
	return {
		topic: Topic,
		bind: function(evt,fn) { Topic(evt).subscribe(fn); },
		trigger: function(evt,args) { Topic(evt).publish(args); },
		unbind: function(evt, fn) { Topic(evt).unbind(fn); }
	};

	
});