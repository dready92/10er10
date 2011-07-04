exports.port = 8888;

exports.gzipContentEncoding = true;


exports.couch_prod = {
	d10: {dsn: "http://localhost:5984/",database:"d10"},
	d10wi: {dsn: "http://localhost:5984/",database:"d10wi"},
	auth: {dsn: "http://localhost:5984/",database:"auth"},
	track: {dsn: "http://localhost:5984/",database:"track"}
};

exports.couch_dev = {
        d10: {dsn: "http://localhost:5984/",database:"d10-test2"},
        d10wi: {dsn: "http://localhost:5984/",database:"d10wi-test2"},
        auth: {dsn: "http://localhost:5984/",database:"auth-test2"},
        track: {dsn: "http://localhost:5984/",database:"track-test2"}
};


// templates path
exports.templates = {
	node: "../views/10er10.com/",
	client: "../views/10er10.com/",
	defaultLang: "en",
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

// used to set the ogg path in the URL of the browser
// unless you know what you're doing (eg you're reverse-proxying 10er10) don't change this
exports.audio_root = "/audio/";

exports.images = {
	tmpdir: "../audio/tmp",
	dir: "../audio/images",
	maxSize: 128			// maximum image size in pixel (width or height, depending which is larger)
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
	vorbiscomment: "/usr/bin/vorbiscomment",
	metaflac: "/usr/bin/metaflac",
	flac: "/usr/bin/flac",
	flac_opts: ["-d","--totally-silent","-"]
	
}


exports.javascript = {
	includes : [
		"modernizr-1.6.min.js",
		"jquery.sprintf.js",
		"jquery.tools.min.js",
		"jquery.csstransform.js",
		"jquery.ovlay.js",
		"jquery.includes.js",
		"jquery.resizer.js",
		"mustache.js",
		"dnd.js",
		"utils.js",
		"track.js",
// 		"player.js",
		"menumanager.js",
		"httpbroker.js",
// 		"playlist.js",
		"playlistDriverDefault.js",
		"playlistDriverRpl.js",
		"playlist.new.js",
		"playlistModuleRadio.js",
		"playlistModuleControls.js",
		"playlistModuleTime.js",
		"playlistModuleTitle.js",
		"playlistModuleTopinfos.js",
		"playlistModuleVolume.js",
		"playlistModuleRpl.js",
		"playlistModuleHighlight.js",
		"playlistModuleFade.js",
		"playlistModuleImage.js",
		"playlistModuleSpectrum.js",
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
exports.emailSenderLabel = "10er10";
exports.invites = {
	ttl:7 , // in days
	domain: "invites.10er10.com", // invites are based on a nameVirtualhost
	url: "http://invites.10er10.com/code/in{{id}}",
	websiteUrl: "http://10er10.com/", // the link displayed at the end of the registration process
	subject: "Invitation: découvrez 10er10",
	message: "Bonjour !\n\n"+
"Un de vos amis a pensé à vous! Ceci est une invitation pour découvrir 10er10, un site web privé d'écoute et de partage de musique.\n\n"+
"10er10 vous permet d'enregistrer vos morceaux MP3 et OGG, de les écouter, de créer vos propres playlists. Vous bénéficiez ainsi d'une discothèque disponible à tout moment sur Internet, que vous soyez cher vous, chez vos amis, au travail... 10er10 utilise les dernières technologies HTML5, c'est pourquoi il vous faut un navigateur moderne pour que le site fonctionne correctement. Nous vous conseillons Mozilla Firefox ou Google Chrome.\n\n"+
"Personne ne connait mieux que vous votre musique. C'est pourquoi nous ne vous demandons pas de mettre toutes vos chansons sur le serveur, mais uniquement le meilleur, la crème de la créme. C'est aussi pourquoi, une fois que vous enregistrez une chanson sur le serveur, nous vous demandons de la valider : ceci permet d'avoir un index à jour du contenu des morceaux (artistes, titres, genres musicaux), afin que le catalogue soit le plus pertinent possible.\n\n"+
"10er10 respecte votre vie privée : le serveur web n'enregistre pas les connexions, nous ne gardons pas votre adresse email... Alors attention ! Il est indispensable que vous reteniez bien votre login et votre mot de passe : le site n'a aucun moyen de vous le renvoyer si vous l'avez oublié. Notez-le, envoyez-le vous par email...\n\n"+
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

    'my.song_template_trailer': 'html/my/song_template_trailer.html',
    'my.song_template_review_header': 'html/my/song_template_review_header.html',
    'my.song_template_review_trailer': 'html/my/song_template_review_trailer.html',
	'my.plm': 'html/my/plm.html',
    'my.plm.rpl': 'html/my/plm_rpl.html',
	'my.image.widget':'html/my/image.widget.html',
	'library.content.simple': 'html/library/content_simple.html',
	'library.content.genre': 'html/library/content_genre.html',
    'library.content.none':'html/library/content_none.html',
	'library.content.artist.related':'html/library/content_artist_related.html',
	'library.content.extended.2parts':'html/library/content_extended_2parts.html',
    'library.control.genre':'html/library/control_genre.html',
    'library.control.artist':'html/library/control_artist.html',
    'library.control.album':'html/library/control_album.html',
    'library.control.title':'html/library/control_title.html',
    'library.listing.artist':'html/library/listing_artist.html',
    'library.listing.artist.line':'html/library/listing_artist_line.html',
    'library.listing.genre':'html/library/listing_genre.html',
    'library.listing.genre.line':'html/library/listing_genre_line.html',
    'hoverbox.addsong.container':'html/hoverbox/addsong.container.html',
	'hoverbox.playlist.container': 'html/hoverbox/playlist.container.html',
	'hoverbox.playlist.rpl.container': 'html/hoverbox/playlist.rpl.container.html',
    'upload.file.widget':'html/upload/file.widget.html',
    'loading':'html/pleaseWait.html',
    'refresh':'html/refresh.html',
	'results.album':'html/results/album.html',
	'results.artist':'html/results/artist.html',

    // should always be at the end : that what's client JS check
    'song_template':'html/song_template/song.html'
};



