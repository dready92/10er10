define(["js/d10.eventsBinder"],function(eventsBinder) {

	return function playlistModule (name, bindings, hooks) {
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
});

