/*

wait for a JSON object :
{
'method' : GET , POST, PUT
'url' : http://...
'callback' : fn name
'data': data to send (optionnal)
'dataType' : html , json
}

send back a JSON object :

'status': 'success/error'
'callback' : => the callback
'data' : =>the data

*/


/* worker onmessage callback */
onmessage = function(e){
	var data = null;
	try {
		data = JSON.parse(e.data);
	} catch (e) {
		sendError({}, 'bad data format');
	}
	if ( ! data.method ||	( data.method != 'GET' && data.method != 'POST' && data.method != 'PUT' && data.method != 'DELETE' ) ) {
		sendError(data,'bad method');
		return ;
	} else if (  ! data.url ) {
		sendError(data, 'bad url');
		return ;
	} else if ( ! data.dataType ) {
		sendError(data, 'bad dataType');
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
  var url = data.url;
  if ( data.method == 'GET' && data.toSend ) {
    url+='?'+ data.toSend;
		delete data.toSend;
  }

	xmlhttp.open(data.method, url,false);

	if ( data.contentType ) {
		xmlhttp.setRequestHeader("Content-Type", data.contentType);
	} else if ( data.method == 'POST' || data.method == 'PUT' ) {
		xmlhttp.setRequestHeader("Content-Type", "application/json");
	}


	if ( data.toSend )	xmlhttp.send(data.toSend);
	else									xmlhttp.send(null);

	var decoded = xmlhttp.responseText,
		contentType = xmlhttp.getResponseHeader("Content-Type") || "text/html";
	if ( data.dataType == 'json' || contentType.match(/application\/json/) ) {
		try {
			decoded = JSON.parse(xmlhttp.responseText);
		} catch (ex) {
			decoded = xmlhttp.responseText;
		}
	}
	sendRestResult(data, xmlhttp.status, xmlhttp.getAllResponseHeaders(), decoded);

};


function sendError(request,error) {
	postMessage (
    JSON.stringify({ 'status': 'error', 'data': null, 'error': error,'request_id': request.request_id })
  );
}


function sendRestResult (request, status, headers, result ) {
	postMessage (
    JSON.stringify({ status: "success", code: status, headers: headers, 'data': result, 'request_id': request.request_id })
  );
}
