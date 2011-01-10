var url = null;

/* worker onmessage callback */
onmessage = function(e){
  try {
    data = JSON.parse(e.data);
    if ( data.url ) { url = data.url; }
  } catch (e) { }
};


function ping() {
  if ( !url ) {
    return ;
  }
  var xmlhttp = null;
  try {
    xmlhttp = new XMLHttpRequest();
  } catch (ex) {
    xmlhttp=false;
    sendError(data, 'unable to create XMLHTTPRequest');
    return ;
  }
  xmlhttp.open('GET', url,false);
  xmlhttp.send(null);
  xmlhttp = null;
};

setInterval(ping, 300000);
// setInterval(ping, 3000);