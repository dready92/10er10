exports.port = 8888;

exports.couch = {
	d10: {dsn: "http://localhost:5984/",database:"d10-test"},
	auth: {dsn: "http://localhost:5984/",database:"auth-test"},
	track: {dsn: "http://localhost:5984/",database:"track-test"}
};

// templates path
exports.templates = {
	node: "../views/10er10.com/",
	client: "../views/10er10.com/",
	invites: "../views/invites.10er10.com/"
};

// cookie name
exports.cookieName = "doBadThings";
exports.cookiePath = "/";

// cookie time to live ( in miliseconds )
exports.cookieTtl = 1000*60*60*24*15;

// results per page
exports.rpp = 30;

exports.audio = {
	tmpdir: "../audio/tmp",
	dir: "../audio/files"
};

exports.cmds = {
	file: "/usr/bin/file",
	file_options: "-bi",
	lame: "/usr/bin/lame",
	lame_opts:  ["--mp3input","--quiet","--decode","-","-"],
	oggenc: "/usr/bin/oggenc",
	oggenc_opts: ["--quiet","-o"],
	ogginfo: "/usr/bin/ogginfo",
	utrac: "/usr/local/bin/utrac",
	taginfo: "/usr/local/bin/taginfo",
	vorbiscomment: "/usr/bin/vorbiscomment"
	
}


exports.javascript = {
	includes : [
		"modernizr-1.6.min.js",
		"jquery.sprintf.js",
		"jquery.tools.min.js",
		"jquery.csstransform.js",
		"jquery.ovlay.js",
		"jquery.includes.js",
		"mustache.js",
		"dnd.js",
		"utils.js",
		"track.js",
// 		"player.js",
		"menumanager.js",
		"httpbroker.js",
// 		"playlist.js",
		"playlistDriverDefault.js",
		"playlist.new.js",
		"playlistModuleRadio.js",
		"playlistModuleControls.js",
		"playlistModuleTime.js",
		"playlistModuleTitle.js",
		"playlistModuleTopinfos.js",
		"playlistModuleVolume.js",
		"paginer.js",
		"plm.js",
		"my.js",
		"upload.js",
		"library.js",
		"welcome.js",
		"results.js",
		"user.js",
		"osd.js",
		"localcache.js",
		"bgtask.js"
	]
};


exports.emailSender = "root@10er10.com";
exports.emailSenderLabel = "Deezer10";
exports.invites = {
	ttl:7 ,
	url: "http://invites.10er10.com/code/in{{id}}",
	subject: "Invitation: découvrez Deezer10",
	message: "Bonjour !\n\n"+
"Un de vos amis a pensé à vous! Ceci est une invitation pour découvrir Deezer10, un site web privé d'écoute et de partage de musique.\n\n"+
"Deezer10 vous permet d'enregistrer vos morceaux MP3 et OGG, de les écouter, de créer vos propres playlists. Vous bénéficiez ainsi d'une discothèque disponible à tout moment sur Internet, que vous soyez cher vous, chez vos amis, au travail... Deezer10 utilise les dernières technologies HTML5, c'est pourquoi il vous faut un navigateur moderne pour que le site fonctionne correctement. Nous vous conseillons Mozilla Firefox ou Google Chrome.\n\n"+
"Personne ne connait mieux que vous votre musique. C'est pourquoi nous ne vous demandons pas de mettre toutes vos chansons sur le serveur, mais uniquement le meilleur, la crème de la créme. C'est aussi pourquoi, une fois que vous enregistrez une chanson sur le serveur, nous vous demandons de la valider : ceci permet d'avoir un index à jour du contenu des morceaux (artistes, titres, genres musicaux), afin que le catalogue soit le plus pertinent possible.\n\n"+
"Deezer10 respecte votre vie privée : le serveur web n'enregistre pas les connexions, nous ne gardons pas votre adresse email... Alors attention ! Il est indispensable que vous reteniez bien votre login et votre mot de passe : le site n'a aucun moyen de vous le renvoyer si vous l'avez oublié. Notez-le, envoyez-le vous par email...\n\n"+
"Cette invitation est valide pendant {{ttl}} jours. Pour créer votre compte, connectez vous dès maintenant ici :\n\n"+
"{{>url}}\n\n"+
"A bientôt,\n\n"+
"Le staff\n"
}
		
		

exports.genres = [
'Blues',
'Classic Rock',
'Country',
'Dance',
'Disco',
'Funk',
'Grunge',
'Hip-Hop',
'Jazz',
'Metal',
'New Age',
'Oldies',
'Other',
'Pop',
'R&B',
'Rap',
'Reggae',
'Rock',
'Techno',
'Industrial',
'Alternative',
'Ska',
'Death Metal',
'Pranks',
'Soundtrack',
'Euro-Techno',
'Ambient',
'Trip-Hop',
'Vocal',
'Jazz+Funk',
'Fusion',
'Trance',
'Classical',
'Instrumental',
'Acid',
'House',
'Game',
'Sound Clip',
'Gospel',
'Noise',
'Alternative Rock',
'Bass',
'Soul',
'Punk',
'Space',
'Meditative',
'Instrumental Pop',
'Instrumental Rock',
'Ethnic',
'Gothic',
'Darkwave',
'Techno-Industrial',
'Electronic',
'Pop-Folk',
'Eurodance',
'Dream',
'Southern Rock',
'Comedy',
'Cult',
 'Gangsta',
'Top 40',
'Christian Rap',
'Pop/Funk',
'Jungle',
'Native US',
'Cabaret',
'New Wave',
'Psychedelic',
'Rave',
'Showtunes',
'Trailer',
 'Lo-Fi',
'Tribal',
'Acid Punk',
 'Acid Jazz',
 'Polka',
 'Retro',
'Musical',
'Rock & Roll',
'Hard Rock',
'Folk',
'Folk-Rock',
'National Folk',
'Swing',
'Fast Fusion',
'Bebob',
'Latin',
'Revival',
'Celtic',
'Bluegrass',
'Avantgarde',
'Gothic Rock',
'Progressive Rock',
'Psychedelic Rock',
'Symphonic Rock',
'Slow Rock',
'Big Band',
'Chorus',
'Easy Listening',
'Acoustic',
'Humour',
'Speech',
'Chanson',
'Opera',
'Chamber Music',
'Sonata',
'Symphony',
'Booty Bass',
'Primus',
'Porn Groove',
'Satire',
'Slow Jam',
'Club',
'Tango',
'Samba',
'Folklore',
'Ballad',
'Power Ballad',
'Rhytmic Soul',
'Freestyle',
'Duet',
'Punk Rock',
'Drum Solo',
'Acapella',
'Euro-House',
'Dance Hall',
'Goa',
'Drum & Bass',
'Club-House',
'Hardcore',
'Terror',
'Indie',
'BritPop',
'Negerpunk',
'Polsk Punk',
'Beat',
'Christian Gangsta',
'Heavy Metal',
'Black Metal',
'Crossover',
'Contemporary C',
'Christian Rock',
'Merengue',
'Salsa',
'Thrash Metal',
'Anime',
'JPop',
'SynthPop',
'Dub'
];

exports.templates.clientList = {

    'my.song_template_trailer': 'html/my/song_template_trailer.php',
    'my.song_template_review_header': 'html/my/song_template_review_header.php',
    'my.song_template_review_trailer': 'html/my/song_template_review_trailer.php',
	'my.plm': 'html/my/plm.php',
    'my.plm.rpl': 'html/my/plm_rpl.php',
	'library.content.simple': 'html/library/content_simple.php',
	'library.content.genre': 'html/library/content_genre.php',
    'library.content.none':'html/library/content_none.php',
    'library.control.genre':'html/library/control_genre.php',
    'library.control.artist':'html/library/control_artist.php',
    'library.control.album':'html/library/control_album.php',
    'library.control.title':'html/library/control_title.php',
    'library.listing.artist':'html/library/listing_artist.php',
    'library.listing.artist.line':'html/library/listing_artist_line.php',
    'library.listing.genre':'html/library/listing_genre.php',
    'library.listing.genre.line':'html/library/listing_genre_line.php',
    'hoverbox.addsong.container':'html/hoverbox/addsong.container.php',
    'hoverbox.playlistrow':'html/hoverbox/playlistrow.php',
    'upload.file.widget':'html/upload/file.widget.php',
    'loading':'html/pleaseWait.php',
    'refresh':'html/refresh.php',
	'results.album':'html/results/album.php',
	'results.artist':'html/results/artist.php',

    // should always be at the end : that what's client JS check
    'song_template':'html/song_template/song.php'
};



