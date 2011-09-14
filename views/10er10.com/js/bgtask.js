(function($){

var bgtask = function() {
  var ival = null;

  var tasks = [
    function() {
      d10.bghttp.get({
        "url": site_url+"/api/serverLoad",
        "dataType": "json",
        "success": function(data) {
          if ( data.status == "success"  ) {
            var load = data.data.load.shift();
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
      d10.bghttp.get({
        "url": site_url+"/api/length",
        "dataType": "json",
        "success": function(data) {
          if ( data.status == "success"  ) {
            var length = parseInt(data.data.length / 60 / 60);
			$("footer span.hours").html(length);
          }
        }
      });

    }
  ];

  tasks.unshift(function() {
    d10.rest.user.toReview({
      load: function(err, data) {
        if ( !err  ) {
          var rr = $("#reviewReminder");
          if ( data.count ) {
            $("strong",rr).html(data.count);
            if ( rr.is(":visible") ) {
              rr.whoobee();
            } else {
              rr.slideDown(function() {
                rr.flipflap();
              });
            }
          } else if ( rr.is(":visible") ) {
            rr.slideUp("fast");
          }
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

d10.bgtask = new bgtask();


})(jQuery);