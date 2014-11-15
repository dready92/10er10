'use strict';

var d10 = require ("./d10"),
  qs = require("qs");

var _random = function(view, request,response) {
  var getArray = function(v) {
    if ( typeof v == "undefined" ) return [];
    if ( Object.prototype.toString.call(v) !== '[object Array]' ) {
      if( v.length ) return [v];
      return [];
    }
    return v;
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

  var body = "";
  request.setEncoding("utf8");
  request.on("data",function(chunk) { body+=chunk; });
  request.on("end",function() {
    request.body = qs.parse(body);
    var count = parseInt(request.body.count);
    if ( isNaN(count) || count < 1 ){
      return d10.realrest.err(427,"count",request.ctx);
    }
    var data = {};
    var name = getArray(request.body["name"]);
    if ( name.length ) {
      data.keys = name;
    }
    var not = getArray(request.body["not"]);
    var really_not = getArray(request.body["really_not"]);
    d10.couch.d10.view(view,data,function(err,response) {
      if ( err ) {
        return d10.realrest.err(423,err,request.ctx);
      }
      var random = getRandomIds(response,count,not,really_not);
      if ( !random.length ) {
        return d10.realrest.success({songs: []},request.ctx);
      }
      d10.couch.d10.getAllDocs({keys: random, include_docs: true},function(err,resp) {
        if ( err ) {
          return d10.realrest.err(423,err,request.ctx);
        }
        var back = [];
        resp.rows.forEach(function(v) { back.push(v.doc); });
        d10.realrest.success(back,request.ctx);
      });
    });
  });
};

module.exports = _random;
