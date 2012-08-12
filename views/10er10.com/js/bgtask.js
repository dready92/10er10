define(["js/d10.rest", "js/d10.events"],function(rest, pubsub) {

  var bgtask = function() {
    var ival = null;

    var tasks = [
      function() {
        rest.server.load({
          load: function(err, data) {
            if ( !err  ) {
              pubsub.topic("server.load").publish(data.load);
            }
          }
        });
      },
      function() {
        rest.server.length({
          load: function(err, data) {
            if ( !err  ) {
              pubsub.topic("library.totalSecondsOfMusic").publish(parseInt(data.length,10));
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
