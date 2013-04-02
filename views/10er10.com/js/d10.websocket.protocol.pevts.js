define(["js/config", "js/d10.events"], function(config, pubsub) {
  var name = "pevts";
  
  var songProcessorRegexp = /^song-processor:/;
  var songProcessorTopic = pubsub.topic("song-processor");
  
  function onmessage (wsMessage) {
    try {
      var data = JSON.parse( wsMessage );
    } catch(e) {
      debug("Bad websocket message ",wsMessage.data," can't be substringed");
      return ;
    }
    debug(data);
    if ( !("event" in data) ) {
      debug("Bad pevts message ignored: no event attribute");
    }
    if ( songProcessorRegexp.test(data.event) ) {
      songProcessorTopic.publish(data);
    }
  };
  
  function prepare(options) {
    return JSON.stringify(options);
  };
  
  return {
    prepare: prepare,
    onmessage: onmessage,
    name: name
  };
  
});