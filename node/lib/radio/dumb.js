'use strict';

var d10 = require ("../../d10"),
  qs = require("qs");

var _random = function(view, request,response) {
  var count = parseInt(request.body.count);
  if ( isNaN(count) || count < 1 ){
    return d10.realrest.err(427,"count",request.ctx);
  }
  randomWork(view, request.body, count, function(err, resp) {
    if ( err ) {
      return d10.realrest.err(err.code,err.message,request.ctx);
    }
    return d10.realrest.success(resp, request.ctx);
  });

};

var getRandomIds = function (resp,count,not,really_not) {

  var shuffle = function(o){ //v1.0
    for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  };


  var ids = [];
  resp.rows.forEach(function(v,k) { ids.push(v.id); });
  if ( !ids.length )	return ids;
  really_not.forEach(function(v,k) {
    if( ids.indexOf(v) >=0 )	ids.splice(ids.indexOf(v),1);
  });
  if ( !ids.length )	return ids;
  not.forEach(function(v,k) {
    if( ids.indexOf(v) >=0 )	ids.splice(ids.indexOf(v),1);
  });
  if ( !ids.length ) {
    return getRandomIds(resp,count,[],really_not);
  }
  if (  count > ids.length ) {
    return shuffle(ids);
  }

  if ( count == 1 ) {
    var r = Math.floor(Math.random()*ids.length);
    return ids[r];
  }
  shuffle(ids);
  return ids.slice(0,count);
};

var randomWork = function(view, body, count, callback) {
  var data = {};
  var getArray = function(v) {
    if ( typeof v == "undefined" ) return [];
    if ( Object.prototype.toString.call(v) !== '[object Array]' ) {
      if( v.length ) return [v];
      return [];
    }
    return v;
  };

  var name = getArray(body.name);
  if ( name.length ) {
    data.keys = name;
  }
  var not = getArray(body.not);
  var really_not = getArray(body.really_not);
  d10.couch.d10.view(view,data,function(err,response) {
    if ( err ) {
      return callback({code: 423, message: err});
    }
    var random = getRandomIds(response,count,not,really_not);
    if ( !random.length ) {
      return callback(null, {songs: []});
    }
    d10.couch.d10.getAllDocs({keys: random, include_docs: true},function(err,resp) {
      if ( err ) {
        return callback({code: 423, message: err});
      }
      var back = [];
      resp.rows.forEach(function(v) { back.push(v.doc); });
      return callback(null, back);
    });
  });
};

_random.work = randomWork;

module.exports = _random;
