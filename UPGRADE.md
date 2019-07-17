Upgrade from 0.23 to 1.0.0
==========================

- Storage system has switched from CouchDB to MongoDB. Follow [the specific migration document](./doc/couch%20to%20mongo%20migration.md).
- NodeJS runtime has been updated. Use NodeJS version 10 or higher.

Upgrade from 0.22 to 0.23
=========================

- install the files from the tarball (thus replacing the old 10er10 version). Keep your file **node/config.local.js** in place, as it's the only file having your personnal configuration.

- install the node **ncouch** module : from the UNIX user you setup node & npm, run

    npm install ncouch

- restart the node 10er10 server

**What changed ?**

- new smartphone interface to connect to a running 10er10 session and remote control it. Just go to http://your.10er10.server.com/rc/

Upgrade from 0.21 to 0.22
=========================

- install the files from the tarball (thus replacing the old 10er10 version). Keep your file **node/config.local.js** in place, as it's the only file having your personnal configuration.

- restart the node 10er10 server

**What changed ?**

- new smartphone interface to connect to a running 10er10 session and remote control it. Just go to http://your.10er10.server.com/rc/

Upgrade from 0.20 to 0.21
=========================

- install the files from the tarball (thus replacing the old 10er10 version). Keep your file **node/config.local.js** in place, as it's the only file having your personnal configuration.

- restart the node 10er10 server

**What changed ?**

- display of albums by little widgets: no more popin, use classy details panel
- playback should work fine on Chrome
- use percents for time progressbar

Upgrade from 0.14 to 0.20
=========================

- install the files from the tarball (thus replacing the old 10er10 version). Keep your file **node/config.local.js** in place, as it's the only file having your personnal configuration.

- install the node **ws** and **debug** modules : from the UNIX user you setup node & npm, run

    npm install ws debug

- restart the node 10er10 server

**What changed ?**

- UI refresh : less gradient, fixed top bar
- use websockets. This leads to a better user experience when uploading songs: the user get the encoding progress
- also parse artists client-side: when displayed the songs title don't contains artists, and artists are independently clickable
- use animation frames feature for spectrum

Upgrade from 0.13 to 0.14
=========================

- install the files from the tarball (thus replacing the old 10er10 version). Keep your file **node/config.local.js** in place, as it's the only file having your personnal configuration.

- install the node **nodemailer** module : from the UNIX user you setup node & npm, run

    npm install nodemailer

- restart the node 10er10 server

**What changed ?**

- reworked UI for player options (radio mode, fade, spectrum on FF)
- drag'n'drop an image in single album view to set image to all album songs
- use nodemailer instead of node-mailer npm module to send invites emails
- new mix playlist module

Upgrade from 0.12 to 0.13
=========================

- install the files from the tarball (thus replacing the old 10er10 version). Keep your file **node/config.local.js** in place, as it's the only file having your personnal configuration.
- re-run the installer script (don't worry, it won't eat your dog) : go to **node/install**. Then:

To upgrade your DEV databases, run

    node install.js

To upgrade your PROD databases, run

    node install.js -p

- install the node **mmmagic** module : from the UNIX user you setup node & npm, run

    npm install mmmagic

- restart the node 10er10 server

**What changed ?**

- artist catalog can be filtered by genre
- replaced Unix *file* utility by the mmmagic module
- record original audio file if uploaded audio file is an mp3 or m4a (why this ? Read it here https://plus.google.com/u/0/b/109983204693472020055/109983204693472020055/posts/WeWEfbgcuVD )

Upgrade from 0.11 to 0.12
=========================

- install the files from the tarball (thus replacing the old 10er10 version). Keep your file **node/config.local.js** in place, as it's the only file having your personnal configuration.
- re-run the installer script (don't worry, it won't eat your dog) : go to **node/install**. Then:

To upgrade your DEV databases, run

    node install.js

To upgrade your PROD databases, run

    node install.js -p

- restart the node 10er10 server

**What changed ?**

- use CSS media queries to adapt search results width and my playlists width
- display the time at cursor in progression bar
- click on an artist or album in search results minified boxes to open it
- dedicated artist page
- dedicated album page
- two columns layout for the "all artists" page
- renaming of javascript files (empty your browser cache if the website don't work well)

Upgrade from 0.10 to 0.11
=========================

This upgrade main concern is the compatibility with connect 2.X.

- install the files from the tarball (thus replacing the old 10er10 version). Keep your file **node/config.local.js** in place, as it's the only file having your personnal configuration.
- update your npm modules. go to **node/** then issue a :

    npm update

- check, using npm list, that your connect version is >= 2.0.0
- restart the node 10er10 server

**What changed ?**

- node minimum version is 0.6.0
- connect minimum version is 2.0.0
- connect-gzip npm module isn't needed anymore
- fade time setting is now recorded per user
- make fade work back on chrome browser

Upgrade from 0.9 to 0.10
=======================

- install the files from the tarball (thus replacing the old 10er10 version). Keep your file **node/config.local.js** in place, as it's the only file having your personnal configuration.
- re-run the installer script (don't worry, it won't eat your dog) : go to **node/install**. Then:

To upgrade your DEV databases, run

    node install.js

To upgrade your PROD databases, run

    node install.js -p

- restart the node 10er10 server

**What changed ?**

- double-click on a song now adds the song to the playlist and starts playing the song
- top left 10er10 logo is clickable
- exports.library.defaultTab in config.js to select the default display when click on Catalog
- use native gzip module when running with node >= 0.6.0 (no need for connect-gzip module then)
- helper to explain the review number that appears next to "Personnal Space"
- new context menus for songs (when clicking on the + icon)

**Be aware**

In a not so long future, 10er10 will require you to run a node.js >= 0.6.0. This is needed for the software to launch
background jobs, that will allow for even more wonderfulness !

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
- use amd to load javascript
- split library code in several amd modules


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
