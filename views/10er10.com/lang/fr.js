// in templates :
// ((website_title)) => escaped
// (({website_title})) => unescaped

exports.langName = "Français";

exports.server = {
	"login.html": {
		title: "Login",
		form_label: "Please login",
		form_username: "Username",
		form_password: "Password",
		form_submit: "Go !"
	},
	"homepage.html": {
		website_title: "Bienvenue",
		website_loading_message: "Chargement en cours<br><span class=\"count\"></span> / <span class=\"total\"></span>",
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
		side_review_reminder_resume: "<strong></strong>",
		side_likes_tooltip: "<p>J'aime ce morceau</p>Ce morceau apparaitra dans<br>\"Mon espace / Les morceaux que j'aime\"",
		side_tooltip_dislikes: "<p>Je n'aime pas ce morceau</p>Permet de spécifier que ce morceau est mauvais.",
		side_previous_title: "Morceau précédent",
		side_play_title: "Musique ! Jouer les morceaux de la playlist",
		side_pause_title: "Mettre sur pause",
		side_next_title: "Morceau suivant",
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
		side_options_spectrum_title: "Spectre des fréquences",
        side_options_mix_title: "Mixer le prochain morceau",
        side_options_mix_waiting_preload: "En attente de disponibilité du prochain morceau",
        side_options_mix_choose: "< Choisir",
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
		website_total_playing_length: "heures de musique",
		website_logging_out: "Déconnection..."
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
		search_body: "des artistes, des titres de morceaux, ou des albums",
		thats_new: "Nouveautés"
	},
	"html/welcome/wnWidget.album.html": {
		album_by: "par",
		album_songs: "{{songs}} morceau(x)",
		album_add_to_player: "Ajouter dans la liste de lecture"
	},
	"html/my/song_template_trailer.html": {
		edit: "edit"
	},
	"html/my/song_template_review_trailer.html": {
		review: "review"
	},
	"html/my/plm.html": {
		my_playlists_title: "Mes playlists",
		playlist_new_button: "Nouvelle",
		playlist_new_label: "Nom de la nouvelle playlist :",
		playlist_create: "Créer",
		playlist_cancel: "Annuler"
	},
	"html/my/plm_rpl.html": {
		playlist_empty: "Cette playlist est vide !",
		load_in_player: "Charger la playlist dans le lecteur",
		rename_button: "Renommer",
		remove_button: "Supprimer",
		rename_playlist_label: "Renommer la playlist : ",
		cancel_button: "Euh non désolé",
		remove_playlist_label: "Attention ! Vous êtes sur le point d'effacer <strong>définitivement</strong> cette playlist. Etes-vous bien certain ?",
		remove_playlist_ok_button: "Oui",
		loading: "Chargement de la playlist..."
	},
	"html/my/image.widget.html": {
		remove: "Enlever cette image"
	},
	"html/my/reviewHelper_bubble.html": {
		label: "Qu'est ce que c'est ?"
	},
	"html/my/reviewHelper.html": {
		title: "Ajout de nouveaux morceaux",
		introduction: "Vous avez uploadé un ou plusieurs morceaux sur le serveur. Excellent ! <br> Avant de pouvoir les écouter, vous devez vérifier que les informations récupérées sur ce(s) morceau(x), par exemple le title, l'artiste ou le genre, sont correct.",
		steps_intro: "Pour cela:",
		step1: "Cliquer sur le numéro : vous arrivez sur la liste des morceaux que vous devez vérifier",
		step2: "Vérifier le morceau, en corrigeant s'il le faut les informations",
		step3: "Validez : c'est bon ! Le morceau est rajouté dans le catalogue et peut être écouté.",
		button_label: "Ok"
	},
	"html/library/content_simple.html": {
		add_to_playlist: "Tout ajouter à la lecture en cours",
		refresh: "Rafraichir la liste",
		no_song: "Aucun morceau trouvé",
		loading: "Chargement en cours...",
		extended_show_more: "Voir plus d'infos...",
		extended_show_less: "Cacher les infos",
		extended_loading: "Chargement en cours...",
		select_visible: "Sélectionner les morceaux visibles"
	},
	"html/library/content_genre.html": {
		all_genres: "Genres",
		add_to_playlist: "Tout ajouter à la lecture en cours",
		refresh: "Rafraichir la liste",
		no_song: "Aucun morceau trouvé",
		loading: "Chargement en cours...",
		extended_show_more: "Voir plus d'infos...",
		extended_show_less: "Cacher les infos",
		extended_loading: "Chargement en cours...",
		select_visible: "Sélectionner les morceaux visibles"
	},
    "html/library/content_genre_covers.html": {
      loading: "Chargement en cours...",
      no_song: "Aucun morceau trouvé",
      all_genres: "Genres",
      albums: "albums"
    },
    "html/library/content_artist.html": {
		no_song: "Aucun morceau trouvé",
		all_artists: "Artistes",
		greatest_hits: "Morceaux les plus écoutés",
		all_songs: "Tous les morceaux",
		without_album: "Sans album",
		see_album: "Voir l'album",
		add_to_player: "Ajouter à la lecture en cours",
		refresh_page: "Rafraichir la page",
		hours: "h",
		minutes: "min",
		songs: "morceau(x)",
		of_music: "de musique",
		add_all_to_player: "Ajouter tous les morceaux à la lecture en cours",
		nofullgenre_infobar_summary: "Hey! Vous consultez les morceaux {{genre}} de {{artist}}.",
		nofullgenre_infobar_othergenres: "Cet artiste a aussi des morceaux ",
		nofullgenre_infobar_seeall_summary: " Ou alors ",
		nofullgenre_infobar_seeall_link: "Consulter la discographie complète",
		fullgenre_filter_summary:"Filtrer les morceaux par genre:"

    },
	"html/library/content_album.html": {
	  all_albums: "Albums",
	  add_to_player: "Ajouter à la lecture en cours",
	  refresh_page: "Rafraichir la page",
		hours: "h",
		minutes: "min",
		list_view: "En liste",
		covers_view: "jaquettes"

	},
	"html/library/content_none.html": {
		no_song: "Aucun morceau"
	},
	"html/library/content_album_artists.html": {
	  album_artists: "Artistes sur cet album"
	},
	"html/library/content_artist_related.html": {
        you_like: "Vous aimez ",
        also_listen: "Ecoutez aussi",
        view_more: "plus"
	},
	"html/library/content_album_list_header.html": {
		all_albums: "Afficher les jaquettes"
	},
	"html/library/content_album_widget.html": {
		show_songs: "Afficher les morceaux de cet album",
		hide_songs: "Cacher les morceaux",
		hours: "h",
		minutes: "min",
		songs: "morceau(x)"
	},
	"html/library/content_album_all.html": {
		all_albums: "Affichage en liste",
		view_by_letter: "Afficher les albums commençant par la lettre:",
		view_all: "Afficher tous les albums"
	},
	"html/library/control_genre.html": {
		loading: "Chargement en cours..."
	},
	"html/library/listing_artist.html": {
		songs: "morceau(x)"
	},
	"html/library/listing_artist_loading.html": {
		loading: "Chargement"
	},
	"html/library/listing_genre.html": {
		songs_link: "Voir les {{count}} morceaux"
	},
	"html/hoverbox/addsong.container.html": {
		add_to_header: "Ajouter à",
		current_playlist: "lecture en cours",
		playlist_header: "playlist",
		other_actions_header: "Autres actions",
		song_edit: "Modifier les informations du morceau"
	},
	"html/hoverbox/playlist.container.html": {
		remove_all_previous_songs: "Enlever tous les morceaux précédents",
		remove_all_next_songs: "Enlever tous les morceaux suivants",
		artist_songs: "Morceaux de cet artiste...",
		album_songs: "Morceaux de cet album...",
		song_download: "Télécharger",
		song_edit: "Editer les informations de ce morceau"
	},
	"html/hoverbox/playlist.rpl.container.html": {
		load: "Charger..."
	},
    "html/hoverbox/main.songpopin.html": {
        artist_by: "par",
        album_on: "sur",
        genre: "Genre",
        button_add_to_player: "Ajouter à la lecture en cours",
        button_download: "Télécharger",
        button_download_as_ogg: "Télécharger le morceau au format ogg",
        button_download_as_other: "Télécharger le morceau au format {{extension}}",
        button_edit_meta: "Editer les informations",
        button_add_to_playlist: "Ajouter à la liste de lecture...",
        label_back: "Retour",
        label_add_song_to_playlist: "Ajouter <strong>{{title}}</strong> à la liste de lecture:",
        cancel: "Annuler",
        button_new_playlist: "Nouvelle playlist",
        label_new_playlist_name: "Non de la nouvelle playlist",
        button_create_playlist: "Créer et ajouter ce morceau",
        button_remove_all_next_songs: "Enlever tous les morceaux suivants",
        button_remove_all_previous_songs: "Enlever tous les morceaux précédents"
    },
	"html/upload/file.widget.html": {
		review_button: "Valider le morceau",
		close_button: "Fermer",
		type_error: "Le fichier ne sera pas transmis au serveur. Les types de fichiers supportés sont mp3, flac, ogg et m4a.",
		waiting: "En attente",
		cancel_link: "Ne pas envoyer ce morceau"
	},
	"html/pleaseWait.html": {
		loading: "Chargement en cours..."
	},
	"html/refresh.html": {
		refresh_list: "Cette liste n'est plus à jour. Cliquer ici pour la rafraichir."
	},
	"html/results/album.html": {
		open: "voir les morceaux",
		close: "cacher les morceaux",
		songs: "morceau(x)",
		minutes: "minute(s)",
		add_to_player: "Ajouter à la lecture en cours",
		add_after_current_song: "Ajouter juste après le morceau en écoute",
		open_in_library: "Afficher dans le catalogue"
	},
	"html/results/artist.html": {
		open: "voir les morceaux",
		close: "cacher les morceaux",
		songs: "morceau(x)",
		minutes: "minute(s)",
		add_to_player: "Ajouter à la lecture en cours",
		add_after_current_song: "Ajouter juste après le morceau en écoute",
		open_in_library: "Afficher dans le catalogue"
	},
	"html/review/song.html": {
		page_title: "Informations sur le morceau",
		reviewed: "Cette page permet de modifier les informations sur le morceau {{filename}}.",
		introduction: "Il est essentiel de bien renseigner les différentes informations sur ce morceau : de cette façon le catalogue renverra des données pertinentes.<BR>Les champs les plus importants sont le <strong>titre</strong> du morceau, le nom de l'<strong>artiste</strong>, et le <strong>genre</strong>.",
		review_file: "Validation du morceau : ",
		title: "Titre du morceau",
		artist: "Artiste",
		loading: "chargement...",
		no_artist: "Aucun artiste connu",
		album: "Album",
		no_album: "Aucun album connu",
		tracknumber: "Numéro de piste",
		genre: "Genre",
		no_genre: "Aucun genre correspondant",
		date: "Année",
		review_button: "Valider",
		review_and_show_next_button: "Valider & montrer le suivant",
		validating: "Validation...",
		song_images: "Images associées à ce morceau (glisser des images pour les rajouter)",
		list_button: "Revenir à la liste des morceaux à valider",
		reviewed_title: "C'est fait !",
		reviewed_message: "Le morceau <span name=\"artist\"></span> - <span name=\"title\"></span> a été validé.",
		review_other_button: "Valider les informations sur d'autres morceaux",
		upload_button: "Aller dans la partie \"Uploader\"",
		delete_button: "Effacer ce morceau",
		delete_title: "Effacement du morceau {{title}} (par {{artist}})",
		delete_message: "Attention ! Vous êtes sur le point d'effacer le morceau <b>{{title}}</b>. Cette action est irréversible.",
		cancel_delete_button: "Non finalement je ne veux pas effacer ce morceau",
		delete_message_followup: "Avant d'effacer ce morceau, vous pouvez le <a href=\"{{download_link}}\">télécharger</a> sur votre disque local.",
		do_delete_button: "Effacer ce morceau",
		delete_success_message: "Le morceau <b>{{title}}</b> a été définitivement effacé. Il est conseillé de recharger cette page une fois que vous avez effacé tous les morceaux voulus.",
		delete_error_message: "Aie... ceci est une erreur. Le morceau <b>{{title}}</b> n'a peut-être pas été effacé."
	},
	"html/review/song_error.html": {
		error_message: "Le morceau n'a pas pu être trouvé."
	},
	"html/review/list.html": {
		title: "Morceaux à valider",
		unknown_artist: "artiste inconnu",
		unknown_title: "titre inconnu"
	},
	"html/review/none.html": {
		message: "Tous vos morceaux ont déjà été validés. Rendez-vous sur la page <a href=\"#upload\">d'Upload</a> afin de déposer de nouveaux morceaux sur le serveur."
	},
	"review/song.html": {
		title: "Informations sur le morceau",
		reviewed: "Cette page permet de modifier les informations sur le morceau {{filename}}.",
		introduction: "Il est essentiel de bien renseigner les différentes informations sur ce morceau : de cette façon le catalogue renverra des données pertinentes.<BR>Les champs les plus importants sont le <strong>titre</strong> du morceau, le nom de l'<strong>artiste</strong>, et le <strong>genre</strong>.",
		review_file: "Validation du morceau : {{filename}}",
		song_title: "Titre du morceau",
		song_artist: "Artiste",
		loading: "chargement...",
		no_artist: "Aucun artiste connu",
		song_album: "Album",
		no_album: "Aucun album connu",
		song_tracknumber: "Numéro de piste",
		song_genre: "Genre",
		no_genre: "Aucun genre correspondant",
		song_date: "Année",
		review_button: "Valider",
		review_and_show_next_button: "Valider & montrer le suivant",
		validating: "Validation...",
		song_images: "Images associées à ce morceau (glisser des images pour les rajouter)",
		list_button: "Revenir à la liste des morceaux à valider",
		reviewed_title: "C'est fait !",
		reviewed_message: "Le morceau <span name=\"artist\"></span> - <span name=\"title\"></span> a été validé.",
		review_other_button: "Valider les informations sur d'autres morceaux",
		upload_button: "Aller dans la partie \"Uploader\""
	},
	"html/my/invites_none.html": {
		no_invite: "Vous n'avez pas d'invitation à offrir. Désolé"
	},
	"html/my/invites.html": {
		title: "Invitations",
		resume: "Il vous reste <strong name=\"count\">{{count}}</strong> invitations à envoyer pour faire découvrir Deezer10 à vos amis.",
		send_title: "Envoyer une invitation",
		send_description: " Pour envoyer une invitation, inscrivez l'adresse email de votre ami ci dessous, et cliquez sur \"Envoyer l'invitation\". L'application Deezer10 ne conserve pas d'adresse email, et le mail sera envoyé immédiatement.",
		email_address: "Adresse email",
		email_invalid: "L'adresse email est invalide",
		email_send: "Envoyer",
		success_title: "Votre invitation a été envoyée...",
		success_description: "Si au bout de {{ttl}} jours votre ami ne s'est pas inscrit, l'invitation sera alors périmée, et vous sera recréditée. ",
		error_title: "Votre invitation n'a pas été envoyée...",
		error_description:" Le serveur a rencontré une erreur... Merci de retenter dans un moment."
	},
	inline: {
		review_err_no_title: "Le morceau doit avoir un titre",
		review_err_no_artist: "Le morceau doit avoir un artiste",
		review_err_unknown_genre: "Genre inconnu"
		
	}
};

exports.client = {
	"landing.letsgo": "Let's go !",
	"my.review.error.imagesize": "merci de choisir une image a peu pres carré...",
	"my.review.error.filetransfert": "Impossible d'envoyer l'image au serveur",
	"my.review.error.forbidden": "Vous n'êtes pas autorisé à mettre à jour les informations sur ces morceaux",
	"my.review.success.filetransfert": "Image {{filename}} enregistrée",
	"osd.rpl.success.removed": "Playlist <b>{{name}}</b> effacée.",
	"osd.rpl.success.created": "Playlist <b>{{name}}</b> créée.",
	"osd.rpl.success.updated": "Playlist <b>{{name}}</b> mise à jour.",
	"osd.rpl.success.renamed": "Playlist <b>{{name}}</b> renommée.",
	"playlist.anonymous.name": "Playlist non enregistrée",
	"upload.song.uploading": "Transmission du morceau au serveur",
	"upload.song.processing": "Le morceau est en cours de traitement, merci de patienter...",
	"upload.song.success": "Succès",
	"upload.song.alreadyindb": "Ce morceau est déjà disponible",
	"upload.song.serverError": "Erreur du serveur... Essayez de recommencer",
    "upload.server.encoding": "Transcodage... ",
	"library.extendedInfos.artist.albums": "Albums de cet artiste",
	"library.extendedInfos.artist.artists": "Artistes liés",
	"library.extendedInfos.genre.artists": "Artistes",
	"library.extendedInfos.genre.albums": "Albums",
	"library.extendedInfos.artist.genres": "Genres",
	"library.extendedInfos.album.artists": "Artistes",
	"library.scope.toggle.full": "Afficher l'ensemble du catalogue",
	"library.scope.toggle.user": "Afficher uniquement mes morceaux",
	"side.review_reminder": "Vous avez {{count}} morceaux à valider !",
    "playlist.module.mix.choose": "< Choisir",
    "playlist.module.mix.launch": "Lancer"
};