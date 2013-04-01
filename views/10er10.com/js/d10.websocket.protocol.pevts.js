define(["js/config"], function(config) {
  var name = "pevts";
  
  function onmessage (wsMessage) {
    try {
      var data = JSON.parse( wsMessage );
    } catch(e) {
      debug("Bad websocket message ",wsMessage.data," can't be substringed");
      return ;
    }
    debug(data);
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