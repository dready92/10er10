define(["js/d10.websocket.protocol.remot"], function(remot) {
  remot.addRemoteEndPoint("fullPlayStatus");
  remot.addRemoteEndPoint("smallPlayStatus");
  remot.addRemoteEndPoint("play");
  remot.addRemoteEndPoint("pause");
  remot.addRemoteEndPoint("next");
  remot.addRemoteEndPoint("previous");
  remot.addRemoteEndPoint("playSongAtIndex");
  remot.addRemoteEndPoint("removeSongAtIndex");
});