Upgrade from 0.8 to 0.9
=======================

- install the files from the tarball (thus replacing the old 10er10 version). Keep your file **node/config.local.js** in place, as it's the only file having your personnal configuration.
- re-run the installer script (don't worry, it won't eat your dog) : go to **node/install**. Then:

To upgrade your DEV databases, run

    node install.js

To upgrade your PROD databases, run

    node install.js -p

- restart the node 10er10 server

**What changed ?**

- removed backbone.js ( so groups like Ac/dc should work back )
- added display of albums by covers


Upgrade from 0.7 to 0.8
=======================

- install the faad command-line (use your distribution packages. For example: **apt-get install faad** on ubuntu)
- install the files from the tarball (thus replacing the old 10er10 version). Keep your file **node/config.local.js** in place, as it's the only file having your personnal configuration.
- re-run the installer script (don't worry, it won't eat your dog) : go to **node/install**. Then:

To upgrade your DEV databases, run

    node install.js

To upgrade your PROD databases, run

    node install.js -p

- install the node **audiometadata** module : from the UNIX user you setup node & npm, run

    npm install musicmetadata

- restart the node 10er10 server

**What changed ?**

- prettyfied albums list
- use internal node.js library musicmetadata to decode audio tags: no more need for utrac, taginfo, metaflac.
- get image from audio metadata
- support mp4 encoding (.m4a files) : you need to get the faad binary executable and set its path in config.js
- image upload now got upload feedback (using HTML5 canvas)
- could drag'n'drop an image in the library / albums list to set an image for an entire album

Upgrade from 0.6 to 0.7
=======================

- install the files from the tarball (thus replacing the old 10er10 version). Keep your file **node/config.local.js** in place, as it's the only file having your personnal configuration.
- re-run the installer script (don't worry, it won't burn your dog) : go to **node/install**. Then:

To upgrade your DEV databases, run

    node install.js

To upgrade your PROD databases, run

    node install.js -p

- restart the node 10er10 server

**What changed ?**

- added /etc/init.d scripts for debian & ubuntu based distros (thks abeudin)
- new (real) REST api
- you can choose to only display your songs : this has impact on the library, on the search and on the radio mode
- config option allowCustomGenres disable the strict checking of songs genre
- search results now works with infinite scrolling. UX also slightly modified
- prepared support for node.js 0.6
- latest songs posted now show up on frontpage

Upgrade from 0.5 to 0.6
=======================

- backup the configuration file **node/config.js**, as it will be overwritten (but this will change)
- install the files from the tarball (thus replacing the old 10er10 version)
- cd to the 10er10 root directory (the one that contains the *audio*, *node* and *views* folders).
- re-run the installer script (don't worry, it won't burn your dog) : go to **node/install**. Then:

To upgrade your DEV databases, run

    node install.js

To upgrade your PROD databases, run

    node install.js -p

- restart the node 10er10 server

**What changed ?**

- linked informations when displaying an artist, an album or a genre
- new configuration file to keep local settings from being overwritten : Now if you change some value, save it in the file **config.local.js**.
- client-side router using backbone.js
- playlist list autoscroll if currently playing song is not visible
- download link is back
- song removal

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
