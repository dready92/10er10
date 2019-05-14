const debugModule = require('debug');

module.exports = debugProvider;

function debugProvider(identifier) {
  const dbg = debugModule(identifier);
  return (...args) => {
    let str = '';
    args.forEach((arg) => {
      if (arg && typeof arg === 'object') {
        if (arg.stack) {
          str += arg.stack;
        } else {
          str += JSON.stringify(arg);
        }
      } else {
        str += arg;
      }
    });
    dbg(str);
  };
}
