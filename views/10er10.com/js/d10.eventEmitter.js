define( function() {
	var eventEmitter = function (simpleTrigger) {

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

	return eventEmitter;

});
