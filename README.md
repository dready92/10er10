10er10 is an HTML5 audio jukebox. It works on Firefox 4+ and Chromium/Chrome.

Important change for 1.0 version
================================

The storage database has been changed from CouchDB to MongoDB. Please read [the migration documentation](./doc/couch%20to%20mongo%20migration.md) to update.

Install
=======

Install servers
---------------

* MongoDB : Follow the instructions of [the official MongoDB documentation](https://docs.mongodb.com/manual/installation/) to setup MongoDB on your system.

Minimum required version : 4.0.0

* Node.js : install node.js ( http://nodejs.org ) from source or with your package manager.

Minimum required version : 10.0.0

Don't forget to add the node binary's folder to the path of the Unix user which will run 10er10.

Debian squeeze users, using the nodejs deb package : you should create a symlink from /usr/lib/nodejs to /usr/lib/node for connect to work.

Install audio utilities
-----------------------

10er10 website allows you to upload flac, mp3, m4a and ogg audio files. Flac, mp3 and m4a files will be converted on the fly to ogg.

* install **lame** executable : it's certainly is available from your distribution packages

* install **oggenc** executable : it's certainly is available from your distribution packages

* install **ogginfo** executable : it's certainly available from your distribution packages

* install **vorbiscomment** executable : it's certainly available from your distribution packages

* install **flac** executable : it's certainly available from your distribution packages

* install **faad** executable : it's certainly available from your distribution packages

Install graphics utilities
---------------------------

10er10 website allows you to upload images related to songs (eg. album artwork).

* install **GraphicsMagick** executables : it's certainly available from your distribution packages

About 10er10 running environments
---------------------------------

10er10 got two distinct environments : dev and prod. The main difference is that, in the prod environment, all static files are cached by the node.js server (so they are read only once from the filesystem).

10er10 dev HTTP port is 8888. 10er10 prod HTTP port is 8124.

Install 10er10 files & required node modules
--------------------------------------------

Unzip/tar your 10er10 download.

cd to the 10er10 root directory (the one that contains the *audio*, *node* and *views* folders).

* node modules : install required node packages :

        npm install

You should now have a new **node_modules** folder at the same level as the "audio", "node" and "views" folders.

Configure 10er10
----------------

Beginning from 0.6, the preferred way to tweak the configuration is to create a new file **node/config.local.js** and put the settings you want to overwrite.

Example : if you need to set the path where audio file are stored to */some/where/on/the/disk*, open **node/config.local.js** and define the variable inside: like :

    exports.audio = { dir: "/some/where/on/the/disk" };

Doing this, your configuration will be kept when you upgrade your 10er10 server.

Open **node/config.js**

* setup your databases configuration

10er10 uses 1 MongoDB database. Look at **exports.mongo_prod** and **exports.mongo_dev** objects, and be sure to point the DSN to your MongoDB server. Database and collections will be created by the installer.

* configure audio path

10er10 needs two distinct folders to store audio files:


- exports.audio.tmpdir : the temporary folder is where the uploaded files are stored
- exports.audio.dir : this is where the ogg files are stored.

Of course, those two folders should be writable by the unix user that will launch the node server.

* configure images path

10er10 needs two distinct folders to store images:

- exports.images.tmpdir : the temporary folder is where the uploaded files are stored (could be the same than exports.audio.tmpdir)
- exports.images.dir : this is where the images are stored.


* about audio URI

**exports.audio_root** is used by the browser to know where is the path to the audio files. If your 10er10 root is "/", then the audio_root is "/audio". If your 10er10 root is "/somewhere/10er10", set audio_root to "/somewhere/10er10/audio". You can also set the complete URL ( eg http://my.domain.com/10er10/audio ). Unless you're behind a reverse proxy and you know what you're doing, don't change this setting.


* configure Unix utilities

Look at exports.cmds.

- exports.cmds.lame : the path to the lame executable
- exports.cmds.oggenc : the path to the oggenc executable
- exports.cmds.ogginfo : the path to the ogginfo executable
- exports.cmds.vorbiscomment : the path to the vorbiscomment executable
- exports.cmds.flac : the path to the flac executable
- exports.cmds.faad : the path to the faad executable

Still here ? Let's go for the fun part.

Create a 10er10 user
--------------------

Go into the node/admin directory and run the d10-createUser.js script.

The password should be hard enough, or the account won't be created. (at least 8 characters, at least 4 distinct characters).

Won't work :

    test
    xxxxxxxx



To create a user on dev install :

    cd node/admin
    node d10-createUser.js login thepassword

To create a user on prod install :

    cd node/admin
    node d10-createUser.js login thepassword -p

Launch the server
-----------------

Go into the node directory and run the server.js script :

To launch the dev instance :

    cd node
    node server.js

To launch the prod instance :

    cd node
    node server.js -p


You can fire you browser and go to http://[your server]:8888/ if you launched the dev instance, http://[your server]:8124/ if you launched the prod server.

Bonus: Configure your invites server
------------------------------------

You want to send some friends an email so they can create an account on your 10er10 server and start using the application ? The doc folder contains a file to help you configure invites server.


What else ?
-----------

Fork, patch, send pull requests !
