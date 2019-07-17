/* eslint-disable no-console */
/* eslint-disable no-restricted-globals */
let config;
const configParser = require('../configParser');

configParser.getConfig((_err, resp) => {
  if (process.argv.length > 4 && process.argv[4] === '-p') {
    configParser.switchProd();
  } else {
    configParser.switchDev();
  }
  config = resp;
  onConfig();
});

function onConfig() {
  // eslint-disable-next-line global-require
  const d10 = require('../d10');
  d10.setConfig(config).then(onReady);
}

function onReady() {
  // eslint-disable-next-line global-require
  const d10 = require('../d10');

  if (process.argv.length < 4) {
    console.log(`Usage: ${process.argv[0]} ${process.argv[1]} login count [-p]`);
    process.exit(1);
  }

  setTimeout(() => {
    const login = process.argv[2];


    const count = parseInt(process.argv[3], 10);
    if (isNaN(count)) {
      console.log(`${process.argv[3]} is not a number`);
      process.exit(1);
    }

    d10.mcol(d10.COLLECTIONS.USERS).updateOne({ login }, { invites: { $sum: count } })
      .then(() => console.log('Done. Now restart node server or wait maximum 30 minutes (the maximum time for the session cache before it invalidates)'))
      .catch((err) => {
        console.log(err);
        console.log(`Unable to update user document login = ${login}`);
        process.exit(1);
      });
  }, 5000);


  console.log(`Giving user ${process.argv[2]} ${process.argv[3]} more invites`);
  console.log('Hit <Crtl>+C to cancel or wait 5 secs');
}
