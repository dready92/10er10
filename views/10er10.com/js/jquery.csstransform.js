(function($){


var timeUnit = 20;
 
var getSteps = function (start, stop, duration, timeUnit, replacement) {
  var back = [];
  var steps = Math.floor(duration/timeUnit);
  var increment = (stop - start) / steps;
  back.push ( replacement ? replacement.replace('%%',stop) : stop  );
  for ( var i = 2; i<steps; i++) {
    stop = stop - increment;
    back.push(replacement ? replacement.replace('%%',stop) : stop);
  }
  back.push(replacement ? replacement.replace('%%',start) : start);
  return back;
}
 
 
$.fn.cssTransform = function(things, css, next, options) {
  var node=this;
  var steps = [];
  var step = null;
  options = options || {};
  var settings = {"api": false};
  $.extend(settings,options);
  while ( step = things.shift() ) {
    steps = getSteps(step.from, step.to,step.duration,timeUnit,css).concat( steps );
  }
  var ival = setInterval(function() {
    var cur = steps.pop();
    node.css({
      "-moz-transform": cur,
      "-webkit-transform": cur
    });
    if ( !steps.length ) { 
      clearInterval(ival); ival = null; 
      if ( next ) { next(); }
    }
    
  },timeUnit);

  if ( !settings.api ) { return this; }
  return {
    "setNext": function(callback) { next = callback; },
    "stop": function() { if ( ival ) { clearInterval(ival); ival = null; } }
  };
};


$.fn.cyclicWhoobee = function (action, arg ) {
  var node = this;
  var api = node.data("ccstransform");
  debug("cyclic whoobee : ",node , api );
  if ( typeof api == "object" ) {
    debug("got api");
    if ( action == "kill" ) {
      api.stop(); 
      node.removeData("ccstransform");
      return ;
    } else if ( action == "setNext" ) {
      api.setNext(arg);
      return api;
    } else if ( action == "stop" ) {
      debug("setting stop callback");
      api.setNext(function () { node.removeData("csstransform"); });
    } else {
      return api;
    }
  } else {
    debug("no api",api);
  }

  var leffect = function() {
    var localapi = node.cssTransform ([
        {"from": 0, "to": -15, "duration": 300},
        {"from": -14, "to": 15, "duration": 150},
        {"from": 14, "to": -15, "duration": 150},
        {"from": -14, "to": 15, "duration": 150},
        {"from": 14, "to": 0, "duration": 600}
      ],
      "rotate(%%deg)", 
      leffect, 
      {"api": true}
    );
    node.data("csstransform",localapi);
    return localapi;
  };

  if ( action == "start" ) {
    return leffect();
  }
  
};
 
$.fn.flipflap = function() {
  return this.cssTransform ([
    {"from": 0, "to": -15, "duration": 300},
    {"from": -14, "to": 15, "duration": 150},
    {"from": 14, "to": -15, "duration": 150},
    {"from": -14, "to": 15, "duration": 150},
    {"from": 14, "to": 0, "duration": 600}
  ],"rotate(%%deg)");
};
 
$.fn.whoobee = function () {
  return this.cssTransform ([
    {"from": 1, "to": 1.5, "duration": 300},
    {"from": 1.4, "to": 0.5, "duration": 150},
    {"from": 0.7, "to": 1.5, "duration": 150},
    {"from": 1.4, "to": 1, "duration": 150},
    {"from": 1.1, "to": 1.5, "duration": 150},
    {"from": 1.4, "to": 1, "duration": 300}
  ],"scale(%%)");
}


})(jQuery);
