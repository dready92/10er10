exports.port_dev = 8888;
exports.port_prod = 8124;
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
	dir: "../audio/files",
    
    // when the source audio file is already encoded, and not on ogg format,
    // setting this to true will also record the original file
    keepOriginalFile: true
};

// used to set the ogg path in the URL of the browser
// unless you know what you're doing (eg you're reverse-proxying 10er10) don't change this
exports.audio_root = "/audio/";

exports.images = {
	tmpdir: "../audio/tmp",
	dir: "../audio/images",
	maxSize: 128,			// maximum image size in pixel (width or height, depending which is larger)
	default: [ "css/vinyl-green.png", "css/vinyl-blue.png", "css/vinyl-orange.png", "css/vinyl-pink.png", "css/vinyl-red.png", "css/vinyl-turquoise.png", "css/vinyl-violet.png", "css/vinyl-white.png", "css/vinyl-yellow.png" ]
};


exports.cmds = {
	lame: "/usr/bin/lame",
	lame_opts:  ["--mp3input","--quiet","--decode","-","-"],
	oggenc: "/usr/bin/oggenc",
	oggenc_opts: ["--quiet","-o"],
	ogginfo: "/usr/bin/ogginfo",
	vorbiscomment: "/usr/bin/vorbiscomment",
	flac: "/usr/bin/flac",
	flac_opts: ["-d","--totally-silent","-"],
	faad: "/usr/bin/faad",
	faad_opts: ["-qw"]
}


exports.library = {
	// default tab when click on "library" : "genres","albums","titles","hits" (=popular), "creations" (=last songs uploaded)
	defaultTab: "genres"
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
		"jquery.image.js",
		"jquery.d10param.js",
		"require.js",
		"mustache.js"
// 		"underscore-min.js",
// 		"backbone.js",
/*		"dnd.js",
		"d10.templates.js",
		"d10.libraryScope.js",
		"d10.imageUtils.js",
		"d10.jobWorker.js",
		"d10.when.js",
		"d10.eventsBinder.js",
		"d10.playlistModule.js",
		"d10.eventEmitter.js",
		"d10.rest.js",	
		"d10.utils.js",
		"d10.router.js",
		"utils.js",
		"track.js",
// 		"player.js",
// 		"menumanager.js",
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
		"libraryAlbums.js",
		"library.js",
		"welcome.js",
		"results.js",
		"user.js",
		"osd.js",
		"localcache.js",
		"bgtask.js"*/
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
		
		
// set it to true if 10er10 should allow genres that aren't in the exports.genres list
exports.allowCustomGenres = false;
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
	'my.invites.invites': 'html/my/invites.html',
	'my.invites.invites.none': 'html/my/invites_none.html',
	'my.reviewHelper.bubble': 'html/my/reviewHelper_bubble.html',
	'my.reviewHelper': 'html/my/reviewHelper.html',
	'library.content.simple': 'html/library/content_simple.html',
    'library.content.artist': 'html/library/content_artist.html',
	'library.content.album': 'html/library/content_album.html',
	'library.content.genre': 'html/library/content_genre.html',
    'library.content.none':'html/library/content_none.html',
	'library.content.album.artists': 'html/library/content_album_artists.html',
	'library.content.album.widget':'html/library/content_album_widget.html',
	'library.content.album.all':'html/library/content_album_all.html',
	'library.content.album.all.mini':'html/library/content_album_all_mini.html',
	'library.content.album.all.popover':'html/library/content_album_all_popover.html',
	'library.content.album.firstLetter':'html/library/content_album_firstLetter.html',
	'library.content.album.list.header':'html/library/content_album_list_header.html',
	'library.content.artist.related':'html/library/content_artist_related.html',
	'library.content.extended.3part':'html/library/content_extended_3parts.html',
	'library.content.extended.2part':'html/library/content_extended_2parts.html',
	'library.content.extended.1part':'html/library/content_extended_1part.html',
    'library.control.genre':'html/library/control_genre.html',
    'library.listing.artist':'html/library/listing_artist.html',
	'library.listing.artist.loading':'html/library/listing_artist_loading.html',
    'library.listing.genre':'html/library/listing_genre.html',
    'library.listing.genre.line':'html/library/listing_genre_line.html',
    'hoverbox.addsong.container':'html/hoverbox/addsong.container.html',
	'hoverbox.playlist.container': 'html/hoverbox/playlist.container.html',
	'hoverbox.playlist.rpl.container': 'html/hoverbox/playlist.rpl.container.html',
	'hoverbox.library.scope': 'html/hoverbox/library.scope.html',
	'hoverbox.main.songpopin': 'html/hoverbox/main.songpopin.html',
    'hoverbox.genres.list':'html/hoverbox/genres.list.html',
    'upload.file.widget':'html/upload/file.widget.html',
    'loading':'html/pleaseWait.html',
    'refresh':'html/refresh.html',
	'results.album':'html/results/album.html',
	'results.artist':'html/results/artist.html',
	'review.song':'html/review/song.html',
	'review.song.error':'html/review/song_error.html',
	'review.list': 'html/review/list.html',
	'review.list.none': 'html/review/none.html',
	'welcome.wnWidget.album': 'html/welcome/wnWidget.album.html',
    // should always be at the end : that what's client JS check
    'song_template':'html/song_template/song.html'
};



