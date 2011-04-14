10er10 is an HTML5 audio jukebox. It works on Firefox 3.6+ and Chromium/Chrome.

Install
=======

Install servers
---------------

* CouchDB : install CouchDB from source ( http://couchdb.apache.org ), via your package manager, or by downloading the CouchBase Server ( http://www.couchbase.com/ ).

Minimum required version : 1.0.1

* Node.js : install node.js ( http://nodejs.org ) from source or with your package manager.

Minimum required version : 0.4

Don't forget to add the node binary folder to the path of the Unix user which will run 10er10.

* NPM : install the Node package manager ( http://npmjs.org ). Hint : **curl http://npmjs.org/install.sh | sh**

* connect & prompt : install node packages connect and prompt :

    npm install connect prompt

Install audio utilities
-----------------------

10er10 website allows you to upload flac, mp3 and ogg audio files. Flac and mp3 files will be converted on the fly to ogg.

* install **lame** executable : it's certainly is available from your distribution packages

* install **oggenc** executable : it's certainly is available from your distribution packages

* install **ogginfo** executable : it's certainly available from your distribution packages

* install **utrac** executable : it's a utlity to convert whatever the f**** encoding of id3 tags to utf8. Download it from here : http://utrac.sourceforge.net/

* install **taginfo** executable : it's a utility using taglib id3 library to parse id3 tags. ( http://grecni.com/software/taginfo/ ).

* install **vorbiscomment** executable : it's certainly available from your distribution packages

* install **metaflac** executable : it's certainly available from your distribution packages

About 10er10 running environments
---------------------------------

10er10 got two distinct environments : dev and prod. The main difference is that, in the prod environment, all static files are cached by the node.js server (so they are read only once from the filesystem).

10er10 dev HTTP port is 8888. 10er10 prod HTTP port is 8124.

Configure 10er10
----------------

Unzip/tar your 10er10 download and open node/config.js 

* setup your databases configuration

10er10 uses 4 couchdb databases. Look at exports.couch_prod and exports.couch_dev objects, and be sure to point the DSN to your CouchDB server. Databases will be created by the installer.

* configure audio path

10er10 needs two distinct folders to store audio files: 


- exports.audio.tmpdir : the temporary folder is where the uploaded files are stored
- exports.audio.dir : this is where the ogg files are stored. 

Of course, those two folders should be writable by the unix user that will launch the node server.

* configure Unix utilities

Look at exports.cmds.

- exports.cmds.file : the path to the Unix "file" executable.
- exports.cmds.file_options : be careful on this one : some Linux flavors doesn't use the same flags. The output of "file -bi /etc/passwd" should be "text/plain; whatever..."
- exports.cmds.lame : the path to the lame executable
- exports.cmds.oggenc : the path to the oggenc executable
- exports.cmds.ogginfo : the path to the ogginfo executable
- exports.cmds.utrac : the path to the utrac executable
- exports.cmds.taginfo : the path to the taginfo executable
- exports.cmds.vorbiscomment : the path to the vorbiscomment executable
- exports.cmds.metaflac : the path to the metaflac executable
- exports.cmds.flac : the path to the flac executable

Still here ? Let's go for the fun part.
 
Launch the installer
--------------------

go into the node/install directory and run the installer.js script.

To setup dev databases:

    cd node/install
    node install.js

To setup prod databases:

    cd node/install
    node install.js -p


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


You can fire you browser and go to http://<your server>:8888/ if you launched the dev instance, http://<your server>:8124/ if you launched the prod server.

What else ?
-----------

Fork, patch, fix bugs, send pull requests !!
