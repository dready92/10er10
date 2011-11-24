define(["js/d10.events"], function(events) {
	return {
		current: "full",
		toggle: function() {
			var event = this.current == "full" ? "user" : "full";
			this.current = event;
			events.trigger("whenLibraryScopeChange", {scope: event});
		}
	};
});