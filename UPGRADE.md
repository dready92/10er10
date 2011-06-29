Upgrade from 0.4 to 0.5
=======================

- backup the configuration file **node/config.js**, as it will be overwritten
- install the files from the tarball (thus replacing the old 10er10 version)
- cd to the 10er10 root directory (the one that contains the *audio*, *node* and *views* folders).
- run the command :

npm install node-mailer

- re-run the installer script (don't worry, it won't burn your dog) : go to **node/install**. Then:

To upgrade your DEV databases, run

    node install.js

To upgrade your PROD databases, run

    node install.js -p

- restart the node 10er10 server

**What changed ?**

- invites system (needs to be configured, see the instructions in the doc folder. requires npm module node-mailer. You'll need the sendmail executable in the path of the user running the 10er10 server)
- artist tokenizer improved

Upgrade from 0.3 to 0.4
=======================

- backup the configuration file **node/config.js**, as it will be overwritten
- install the files from the tarball (thus replacing the old 10er10 version)

- re-run the installer script (don't worry, it won't burn your kids) : go to **node/install**. Then:

To upgrade your DEV databases, run

    node install.js

To upgrade your PROD databases, run

    node install.js -p

- restart the node 10er10 server

**What changed ?**

- gzip encoding of the answer (requires npm module connect-gzip)
- infinite scrolling for all listings

Upgrade from 0.2 to 0.3
=======================

- backup the configuration file **node/config.js**, as it will be overwritten
- install the files from the tarball (thus replacing the old 10er10 version)

- re-run the installer script (don't worry, it won't eat your kids) : go to **node/install**. Then:

To upgrade your DEV databases, run

    node install.js

To upgrade your PROD databases, run

    node install.js -p

- restart the node 10er10 server

**What changed ?**

- multi-lang capability (currently french & english)
- playlist recording bugfix
- graphical spectrum visualizer for FF4+

Upgrade from 0.1 to 0.2
=======================

- backup the configuration file **node/config.js**, as it will be overwritten
- install the files from the tarball (thus replacing the old 10er10 version)

- re-run the installer script (don't worry, it won't eat your kids) : go to **node/install**. Then:

To upgrade your DEV databases, run

    node install.js

To upgrade your PROD databases, run

    node install.js -p

- restart the node 10er10 server

Upgrade to version 0.1
======================

- backup the configuration file **node/config.js**, as it will be overwritten
- install GraphicsMagick on your linux flavour (should be provided by your package manager)
- install the node **gm** module : from the UNIX user you setup node & npm, run

    npm install gm

- install the files from the tarball (thus replacing the old 10er10 version)

- re-run the installer script (don't worry, it won't hurt your kids) : go to **node/install**. Then:

To upgrade your DEV databases, run

    node install.js

To upgrade your PROD databases, run

    node install.js -p

- restart the node 10er10 server
