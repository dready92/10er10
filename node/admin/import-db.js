var prompt = require("prompt"),
  fs = require("fs"),
  config = require("../config");

let target;
let dirname;
let d10;

const schema = {
  properties: {
    target: {
      description: 'Which db to import to ? production (p) or test (t)',
      type: 'string',
      required: true,
    },
    dirname: {
      description: 'Please give the directory to read files from',
      type: 'string',
      required: true,
    }
  }
};

prompt.start();

prompt.get(schema, (err, result) => {
  if (err) {
    console.log('Error', err);
    process.exit(1);
  }

  target = onTarget(result.target);
  dirname = onDirname(result.dirname);

  setupTargetConfig(target);
  checkDirname();
});

function onTarget(targetEntry) {
  const t = targetEntry.toString().replace(/\s+$/, '');
  if (t !== 'p' && t !== 't') {
    console.log("Bad answer... need p or t");
    process.exit(1);
  }

  return t;
}

function setupTargetConfig(t) {
  if (t === 'p') {
    config.couch = config.couch_prod;
  } else {
    config.couch = config.couch_dev;
  }
  d10 = require('../d10');
  d10.setConfig(config);
  console.log('using databases ', config.couch);
}

function onDirname(dirnameEntry) {
  let dn = dirnameEntry.toString().replace(/\s+$/, "");
  if (dn.length === 0) {
    dn = '.';
  }

  return dn;
}

function checkDirname() {
  fs.stat(dirname, (err, stat) => {
    if (err) {
      console.log("Directory error : ", err.message);
      process.exit(1);
    }
    if (!stat.isDirectory()) {
      console.log("Directory error : ", dirname, " is not a valid directory");
      process.exit(1);
    }

    const dbs = [];
    for (let i in config.couch) {
      dbs.push(i);
    }

    function checkFile() {
      if (!dbs.length) {
        return setupConfig();
      }
      const db = dbs.pop();
      fs.stat(dirname + "/" + db + "-design.json", (err, stat) => {
        if (err) {
          console.log("Error: file "+dirname+"/"+db+"-design.json", err);
          process.exit(1);
        } else {
          console.log("File " + dirname + "/" + db + "-design.json found");
        }
        checkFile();
      });
    }

    checkFile();
  });
};

function setupConfig() {
  const todo = [];
  function then(err) {
    if (err) {
      console.log("Failed to import DB: ",err);
      process.exit(1);
    }
    if (todo.length) {
      todo.pop()();
    } else {
      console.log("End of import");
      process.exit(0);
    }
  }

  for (var i in config.couch) {
    todo.push(
      (function(cfg) {
        return function() { importDb(cfg, then);};
      })(i)
    );
  }

  then();
}


function importDb(db, then) {
  console.log("importing ", db);
  const filename = dirname + "/" + db + "-design.json";
  fs.readFile(filename, (err, str) => {
    if ( err ) {
      console.log("Can't read "+filename);
      then(err);
    } else {
      let design = null;
      try {
        design = JSON.parse(str);
      } catch (e) { design = null; }
      if ( !design ) {
        then ({message: "JSON parsing failed"});
      } else {
        function insertOne() {
          if ( !design.length ) {
            return then();
          }
          var doc = design.pop();
          console.log('Inserting ' + doc._id);

          d10.couch[db].deleteDoc(doc._id, function (err, resp, m) {
            if (err)	console.log(err,resp,m);
            d10.couch[db].storeDoc(doc,function(err,resp) {
              if ( err ) {
                then(err);
              } else {
                insertOne();
              }
            });
          });
        };
        insertOne();
      }
    }
  });
};
