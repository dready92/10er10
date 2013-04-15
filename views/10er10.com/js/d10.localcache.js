define(["js/d10.events"],function(pubsub) {

var cache_ttl = 60000;
pubsub.topic("server.load").subscribe(function(load) {
  var load1 = load.shift();
  if ( load1 < 3 ) {
    cache_ttl = 15000;
  } else if ( load1 < 6 ) {
    cache_ttl = 60000;
  } else {
    cache_ttl = 300000;
  }
});
  
var storagebase = {
  templates: {},
  getTemplate: function (key) {
//     var obj = this.getJSON('site.templates');
//     if ( !obj )	obj = {};
//     return obj[key];
    return this.templates[key];
  },
  setTemplate: function (key,val) {
//     var obj = this.getJSON('site.templates');
//     if ( !obj )	obj = {};
//     obj[key] = val;
//     return this.setJSON('site.templates',obj);
    this.templates[key] = val;
    return true;
  },
  unsetTemplates: function () {
    this.templates = {};
    return true;
  },

  getJSON: function (key) {
    var value = this.get(key);
    if ( value === null || value == undefined ) return value;
    var val = JSON.parse(value);
    if ( val && val._cache_ttl ) {
      var now = new Date();
      if ( now.getTime() - val._cache_ttl > cache_ttl ) {
        debug("localcache: ttl expired");
        this.unset(key);
        return ;
      }
      delete val._cache_ttl;
    }
    return val;
  },
  setJSON: function (key,val,use_ttl) {
    if ( use_ttl ) {
      now = new Date();
      val._cache_ttl = now.getTime();
    }
    return this.set(key,JSON.stringify(val));
  },
  unsetJSON: function (key) {
    return this.unset(key);
  }
};


function memStorage () {
  var cache = {};
  this.getItem = function (key) {
    if ( key in cache ) {
      return cache[key];
    }
    return null;
  }

  this.setItem = function (key,val) {
    cache[key] = val;
  }

  this.removeItem = function (key) {
    if ( key in cache ) {
      delete cache[key];
    }
  }
  
  this.dump = function () {
    var back = {"total": {"items": 0,"bytes":0}, "items": []};
    for ( var index in cache ) {
      back.total.items++;
      back.total.bytes += cache[index].length;
      back.items.push ({ "key": index, "bytes": cache[index].length });
    }
    return back;
  };

}

function localcache ( ) {
  $.extend(this,storagebase);
  var storage = new memStorage();
  this.set = function (key,val) {
    if ( typeof val == 'object' ) {
      debug("error, won't set storage key "+key+": it's an object");
      return false;
    }
    return storage.setItem(key,val);
  }

  this.get = function(key) {
    return storage.getItem(key);
  }

  this.unset = function (key) {
    return storage.removeItem(key);
  }

  this.dump = function () {
    return storage.dump();
  };

}

return new localcache();

});
