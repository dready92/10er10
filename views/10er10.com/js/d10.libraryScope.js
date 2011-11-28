define(["js/d10.events"], function(pubsub) {
	return {
		current: "full",
		toggle: function() {
			var event = this.current == "full" ? "user" : "full";
			this.current = event;
			pubsub.topic("libraryScopeChange").publish(event);
// 			events.trigger("whenLibraryScopeChange", {scope: event});
		}
	};
});