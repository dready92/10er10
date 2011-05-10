// in templates :
// ((website_title)) => escaped
// (({website_title})) => unescaped

exports = module.exports = {
	"login.html": {
		title: "Login",
		form_label: "Please login",
		form_username: "Username",
		form_password: "Password",
		form_submit: "Go !"
	},
	"homepage.html": {
		website_title: "Bienvenue",
		website_loading_message: "Chargement en cours",
		err_browser_not_supported: "Votre navigateur ne supporte pas les fonctionnalités HTML5 nécessaires pour ce site ! <BR> Ce site a été testé sous <a href=\"http://getfirefox.com\">Mozilla Firefox</a> et <a href=\"http://www.google.com/chrome\">Google Chrome</a>. Si vous voulez plus d'informations concernant les navigateurs, <a href=\"http://www.whatbrowser.org/fr/\">cliquez ici</a>.",
		website_teaser: "Ça va sonner.",
		search_placeholder: "Rechercher...",
		search_label: "Recherche : ",
		search_teaser: "Rechercher des morceaux par titre, artiste, ...",
		upload_title: " Uploader",
		upload_teaser: "Ajouter des morceaux",
		my_title: " Mon espace",
		my_teaser: "Mes chansons, mes playlists...",
		library_title: " Catalogue",
		library_teaser: "Classements par genre, popularité,...",
		welcome_title: " Bienvenue",
		welcome_teaser: "Aide, Mode d'emploi",
		side_review_reminder: "Vous avez <strong></strong> morceaux à valider !",
		side_likes_tooltip: "<p>J'aime ce morceau</p>Ce morceau apparaitra dans<br>\"Mon espace / Les morceaux que j'aime\"",
		side_tooltip_dislikes: "<p>Je n'aime pas ce morceau</p>Permet de spécifier que ce morceau est mauvais.",
		side_previous_title: "Morceau précédent",
		side_play_title: "Musique ! Jouer les morceaux de la playlist",
		side_pause_title: "Mettre sur pause",
		side_next_title: "Morceau suivant",
		side_options_show: "Plus d'options...",
		side_options_radiomode_title: "Mode radio : ajoute des morceaux à la fin de la playlist",
		side_options_radiomode_disabled: "<strong>Mode radio</strong>: désactivé",
		side_options_radiomode_enable: "Activer le mode radio",
		side_options_radiomode_enabled: "<strong>Mode radio</strong>: activé",
		side_options_radiomode_options: "Options du mode radio",
		side_radiomode_genre_selector_title: "Limiter les morceaux ajoutés à la playlist aux genres suivants :",
		side_radiomode_close: "fermer cette fenêtre",
		side_radiomode_disable: "Désactiver le mode radio",
		side_options_audiofade_title: "<strong>Fondu</strong> entre les morceaux",
		side_options_audiofade_seconds: "seconde(s)",
		side_options_hide: "Cacher les options",
		side_playlistloader: "Chargement de la dernière liste de lecture",
		side_playlist_empty: "Votre liste de lecture est vide.",
		side_playlist_fill: "Remplis-la !",
		side_playlist_empty_title: "Vider la liste de lecture",
		side_playlist_empty_button: "   Vider",
		side_playlist_load_title: "Charger une playlist",
		side_playlist_load_button: "    Ouvrir",
		side_playlist_record_title: "Enregistrer la playlist",
		side_playlist_record_button: "    Sauver",
		side_playlistrecord_title: "Enregistrer sous : ",
		side_playlistrecord_placeholder: "playlist name...",
		side_playlistrecord_button: " Enregistrer",
		side_playlistrecord_cancel: "Euh non désolé",
		side_playlistrecord_playlist_name_exists: "Il éxiste déjà une playlist portant ce nom... ",
		side_playlistrecord_playlist_name_exists_button: " Enregistrer quand même",
		website_logged_as: "Logged as",
		website_logout: "se déconnecter",
		website_total_playing_length: "heures de musique"
	},
	"html/results/container.html": {
		artists_details_button: "Voir en détail",
		artists: "Artistes",
		albums_details_button: "Voir en détail",
		albums: "Albums",
		songs_details_button: "Voir en détail",
		songs: "Morceaux"
	},
	"html/library/container.html": {
		newest: "Ajouts récents",
		popular: "Populaires",
		by_title: "Par titre",
		by_genre: "Par genre",
		by_artist: "Par artiste",
		by_album: "Par album"
	},
	"html/my/container.html": {
		to_review: "A valider",
		my_songs: "Mes morceaux",
		my_playlists: "Mes playlists",
		my_favorite_songs: "Les morceaux que j'aime",
		my_invites: "Invitations"
	},
	"html/upload/container.html": {
		box_label: "Faites glisser vos morceaux de musique dans cette boite",
		video_link: "Comment ça marche ?",
		video_close: "Fermer"
	},
	"html/welcome/container.html": {
		listen_title: "Ecoutez",
		listen_body: "les morceaux disponibles dans le catalogue",
		upload_title: "Ajoutez",
		upload_body: "vos morceaux dans le catalogue",
		playlists_title: "Créez",
		playlists_body: "vos playlists dans votre espace dédié",
		search_title: "Recherchez",
		search_body: "des artistes, des titres de morceaux, ou des albums"
	}
};
