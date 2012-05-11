define(["js/d10.rest", "js/d10.events"],function(rest, pubsub) {

	var bgtask = function() {
		var ival = null;

		var tasks = [
			function() {
			rest.server.load({
				load: function(err, data) {
				if ( !err  ) {
					var load = data.load.shift();
					if ( load < 3 ) {
					$("body").data("cache_ttl",15000);
					} else if ( load < 6 ) {
					$("body").data("cache_ttl",60000);
					} else {
					$("body").data("cache_ttl",300000);
					}
				}
				}
			});

			},
			function() {
			rest.server.length({
				load: function(err, data) {
				if ( !err  ) {
					var length = parseInt(data.length / 60 / 60);
					$("footer span.hours").html(length);
				}
				}
			});

			}
		];

		tasks.unshift(function() {
			rest.user.review.count({
				load: function(err, data) {
					if ( !err  ) {
						pubsub.topic("review.count").publish(data);
					}
				}
			});
		});

		var run = function () {
			var tasksCopy = tasks.slice();
			var runOne = function () { 
			var task = tasksCopy.pop();
			task();
			if ( tasksCopy.length ) { setTimeout(runOne,5000); }
			}
			if ( tasksCopy.length ) runOne();
		};


		this.init = function() {
			run();
			setInterval(run,150000);
		};

	};
	
	return new bgtask();
});
