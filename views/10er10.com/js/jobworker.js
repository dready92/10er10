/*

wait for a JSON object :

{
  "job": job name
  "data": job data (if any)
}

*/

var xmlHTTP = function (data,success,error) {
  var xmlhttp = null;
  success = success || function(){};
  error = error|| function(){};
  try {
    xmlhttp = new XMLHttpRequest();
  } catch (ex) {
    xmlhttp=false;
    error(data, 'unable to create XMLHTTPRequest');
    return ;
  }
  var url = data.url;
  if ( data.method == 'GET' && data.data ) {
    url+='?'+ data.data;
  }
  
  xmlhttp.open(data.method, url,false);
  
  if ( data.method == 'POST' ) {
    xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  }
  
  
  if ( data.data )  xmlhttp.send(data.data);
  else                  xmlhttp.send(null);
  
  if ( xmlhttp.status != 200 ) {
    error(data, 'Server status: '+xmlhttp.status);
    return ;
  }
  if ( data.dataType == 'html' ) {
    success(data, xmlhttp.responseText);
  } else if ( data.dataType == 'json' ) {
    var decoded = null;
    try {
      decoded = JSON.parse(xmlhttp.responseText);
    } catch (ex) {
      xmlhttp=false;
      error(data, 'JSON response parsing failed');
    }
    success(data, decoded);
  }
};

var incoming = null;

/* worker onmessage callback */
onmessage = function(e){
//   var data = null;

//   sendResult("OOOKKKKK");
//   return ;
  try {
    incoming = JSON.parse(e.data);
  } catch (e) {
    sendError("parsererror", "bad data format");
    return;
  }

  if ( !incoming.job || !jobs[incoming.job] ) {
    sendError("job", "unknown job");
    return ;
  }
  jobs[incoming.job].job(incoming.data);
//   sendResult({"called": true});
};

function sendError(err,message) {
	postMessage ( JSON.stringify({ "error": err, "message": message }) );
}


function sendResult (result) {
	postMessage ( JSON.stringify({ "data": result }) );
}


var jobs = {
  "enablePing": {
    "interval": null,
    "url": null,
    "job":  function(data) {
      if ( ! jobs.enablePing.interval ) {
        jobs.enablePing.interval = setInterval(pingReporter,900000);
      }
      jobs.enablePing.url = data.url;
      sendResult({"enabled": true});
      pingReporter();
    }
  },
  "player": {
    "buffer": [],
    // data : {"id", "creation","duration","events"}
    "job":  function(data) {

      var id = data.id.replace(/-.*/,'');
      var play = jobs.player.getEvent(data.events,"play");
      if ( play ) {
        if ( jobs.player.shortPath(data.events, data.duration) == true ) {
          jobs.player.buffer.push ({"id": id, "fullplay": true, "play": play, "xp": "clean"});
        } else {
          var ended = jobs.player.getEvent(data.events,"ended");
          var back = { "id": id, "play": play, "fullplay": ended ? true : false, "xp": "clean" };
          var bwf = jobs.player.bandwidthFailure(data.events,back);
          if ( bwf  ) {
            back.xp = "bwExcess";
          }
          jobs.player.buffer.push (back);
        } // if play
      }


      sendResult({"parsed": true,"buffer": jobs.player.buffer});
    },
    "shortPath": function (events, duration) {
      duration = parseInt(duration,10);
      if ( !isNaN(duration) && duration > 0 ) {
        var play = jobs.player.getEvent(events,"play");
        var ended = jobs.player.getEvent(events,"ended");

        if ( play && ended ) {
          var timePlaying = ended.time - play.time;
          if ( timePlaying > duration - 10 && timePlaying < duration + 10 ) {
            return true;
          }
        }
      }
    },
    "bandwidthFailure": function (events, response) {
      var play = jobs.player.getEvent(events,"play");
      if ( !play )  return false;
      var ecopy = events.slice(0);
      var e = null;
      while ( e = ecopy.shift() ) {
        if ( e.event == "play" ) {
          break;
        }
      }
      var w = jobs.player.getEventsCount(ecopy,"waiting");
      var s = jobs.player.getEventsCount(ecopy,"stalled");
      if ( w > 0 || s > 0 ) {
        response.waiting = w;
        response.stalled = s;
        return true;
      }
      return false;
    },
    "getEvent": function(events, name) {
      for ( var i in events ) {
        if ( events[i].event == name )  return events[i];
      }
    },
    "getEventsCount": function (events, name) {
      var count=0;
      for ( var i in events ) {
        if ( events[i].event == name )  count++;
      }
      return count;
    }
  }
};





var pingReporter = function () {
  var ajax = {
    "url": jobs.enablePing.url,
    "method": "POST",
    "data": null
  };
  
  if ( jobs.player.buffer.length ) {
    ajax.data = "player="+encodeURIComponent( JSON.stringify(jobs.player.buffer) );
    jobs.player.buffer = [];
  }
  
  xmlHTTP(ajax);
};





