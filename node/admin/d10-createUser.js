/* eslint-disable no-console,global-require */
let config;


const configParser = require('../configParser');

configParser.getConfig((err, resp) => {
  if (process.argv.length > 4 && process.argv[4] === '-p') {
    configParser.switchProd();
  } else {
    configParser.switchDev();
  }
  config = resp;
  onConfig();
});

function onConfig() {
  const d10 = require('../d10');
  d10.setConfig(config).then(onReady);
}

function onReady() {
  const users = require('../d10.users');

  if (process.argv.length < 4) {
    console.log(`Usage: ${process.argv[0]} ${process.argv[1]} login passwd [-p]`);
    process.exit(1);
  }

  setTimeout(() => {
    const login = process.argv[2];


    const password = process.argv[3];


    users.createUser(login, password, {
      callback(err, resp) {
        if (err) {
          console.log('not created : something went wrong : ', err);
        } else {
          console.log(`user created, id = ${resp}`);
        }
      },
    });
  }, 5000);


  console.log(`Creating user ${process.argv[2]} with password ${process.argv[3]}`);
  console.log('Hit <Crtl>+C to cancel or wait 5 secs');
}
