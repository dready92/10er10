(function() {
  
angular.module("d10session",[]).factory("d10session", function() {
  var rest = require("js/d10.rest");
  var logged = false;

  function isLogged() {
    return logged;
  };
  
  function login(login, password, callback) {
    function onLoginResponse (err,resp) {
      if ( !err ) {
        logged = true;
      }
      callback(err,resp);
    };
    rest.rc.login(login, password, {load: onLoginResponse});
  };
  
  function sessionLogin(callback) {
    function onResponse (err,resp) {
      if ( !err ) {
        logged = true;
      } else {
        logged = false;
      }
      callback(err,resp);
    };

    rest.rc.sessionLogin({load: onResponse});
  };
  
  function logout(callback) {
    function onResponse (err,resp) {
      if ( !err ) {
        logged = false;
      }
      callback(err,resp);
    };
    rest.rc.logout({load: onResponse});
  };
  
  
  return {
    login: login,
    isLogged: isLogged,
    sessionLogin: sessionLogin,
    logout: logout
  };
  
});
  
})();