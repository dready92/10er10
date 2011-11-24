(function($){ 
	window.d10.libraryScope = {
		current: "full",
		toggle: function() {
			var event = this.current == "full" ? "user" : "full";
			this.current = event;
			d10.events.trigger("whenLibraryScopeChange", {scope: event});
		}
	};
})(jQuery);